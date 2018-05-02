/**********************************************************************
 * Description
 * Pull course descriptions from http://www.byui.edu/catalog/#/courses 
 * and put them into Canvas's Description section under Settings 
 **********************************************************************/
const canvas = require('canvas-wrapper');
const puppeteer = require('puppeteer');
const asyncLib = require('async');

module.exports = (course, stepCallback) => {
    /* For testing ONLY */
    // course.info.courseCode = 'ACCTG201';

    /* Some Course Codes might have white spaces between the letters and numbers. This removes them. */
    course.info.courseCode = course.info.courseCode.replace(/\s/g, '');
    var myJSON = '';

    /******************************************************
     * Open the school's API and retrieve the JSON object 
     * with each of the courses PIDs and course codes
     ******************************************************/
    async function clickbait(clickbaitCallback) {
        /* Using Google's Puppeteer, get the body of the page 
        from the following URL which will return a JSON object*/
        const browser = await puppeteer.launch({
            headless: true //change to true in prod!
        });

        const page = await browser.newPage();

        await page.goto('https://byui.kuali.co/api/v1/catalog/courses/58dc843f984c63d67b7f3e4b?q=');

        var content = await page.content();

        /* Get everything in the body (a JSON object) */
        var innerText = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });

        await browser.close();

        /* Send the JSON object to the next function */
        clickbaitCallback(null, innerText);
    }

    /***************************************************
     * Parse through the JSON object to find the course
     * code and PID that match the current course, and 
     * return it as an object
     ***************************************************/
    function parseMyJSON(myJSON) {
        var obj = {};
        /* myJSON is an object array with every course's information */
        /* Loop through each course's information to only get 
           the Course Code and PID of the current course */
        myJSON.forEach(element => {
            var pid = element.pid.replace(/\s/g, '');
            var __catalogCourseId = element.__catalogCourseId.replace(/\s/g, '');
            if (__catalogCourseId === course.info.courseCode) {
                obj = {
                    '__catalogCourseId': __catalogCourseId, // course code
                    'pid': pid,
                }
            }
        });

        /* Return the current course's Course Code and PID */
        return obj;
    }

    /***********************************************
     * Use the PID to access the individual course's
     * description through BYU-Idaho's API
     ***********************************************/
    async function getDescription(catalogCourse, getDescriptionCallback) {
        /* Using Puppeteer again, get the specific course's description from BYU-Idaho's API */
        if (catalogCourse.__catalogCourseId !== course.info.courseCode) {
            getDescriptionCallback(null);
            return;
        }
        const browser = await puppeteer.launch({
            headless: true //change to true in prod!
        });

        const page = await browser.newPage();

        await page.goto(`https://byui.kuali.co/api/v1/catalog/course/58dc843f984c63d67b7f3e4b/${catalogCourse.pid}`);

        var content = await page.content();

        /* Retrieve the body of the page (a JSON object with the course's information) */
        var innerText = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });

        await browser.close();

        /* Return the course's description found in the JSON object */
        getDescriptionCallback(null, innerText.description);
    }

    /*******************************************************
     * Send the description to canvas through a PUT request
     *******************************************************/
    function sendToCanvas(description) {
        /* Update the course's description through a PUT request */
        canvas.put(`/api/v1/courses/${course.info.canvasOU}`, {
            'course[public_description]': description
        }, (putErr) => {
            if (putErr) {
                course.error(new Error(putErr));
            }

            /* Log the description and course ID */
            course.log(`Add Course Description`, {
                'Course ID': course.info.canvasOU,
                'Course Description': description,
            });

            stepCallback(null, course);
        });
    }

    /**************************************************
     * Asynchronously call the functions in the module
     **************************************************/
    function runModule() {
        var catalogCourse = '';
        /* Call clickbait and return the JSON object with all course info objects (myJSON) */
        clickbait((err, myJSON) => {
            if (err) {
                course.error(new Error(err));
                stepCallback(null, course);
                return;
            }

            /* Set catalogCourse to the returned object from 
               parseMyJSON (one course's PID and Course Code) */
            catalogCourse = parseMyJSON(myJSON);

            /* Using the current course's PID and Course Code, get the description of the course */
            getDescription(catalogCourse, (err, description) => {
                if (err) {
                    course.error(new Error(err));
                    stepCallback(null, course);
                    return;
                }
                /* Make sure the course exists */
                if (catalogCourse.__catalogCourseId === undefined) {
                    course.warning(`${course.info.courseCode} does not have a description on http://www.byui.edu/catalog/#/courses so no course description was added`);
                    stepCallback(null, course);
                    return;
                }
                /* If the course description was retrieved from http://www.byui.edu/catalog/#/courses, 
                   then send the description to Canvas */
                sendToCanvas(description);
            });
        });
    }

    /************************************************
     *                  Start here                  *
     ************************************************/
    runModule();
};