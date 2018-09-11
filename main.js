/**********************************************************************
 * Description
 * Pull course descriptions from http://www.byui.edu/catalog/#/courses 
 * and put them into Canvas's Description section under Settings 
 **********************************************************************/
const canvas = require('canvas-wrapper');
const puppeteer = require('puppeteer');

module.exports = (course, stepCallback) => {
    // TESTING - disable for prod
    // course.info.courseCode = 'ACCTG201';

    /* Some Course Codes might have white spaces between the letters and numbers. This removes them. */
    course.info.courseCode = course.info.courseCode.replace(/\s/g, '');

    /******************************************************
     * Open the school's API and retrieve the JSON object 
     * with each of the courses PIDs and course codes
     ******************************************************/
    async function clickbait(clickbaitCallback) {
        try {
            /* Using Google's Puppeteer, get the body of the page 
            from the following URL which will return a JSON object*/
            const browser = await puppeteer.launch({
                headless: true //change to true in prod!
            });

            const page = await browser.newPage();

            await page.goto('https://byui.kuali.co/api/v1/catalog/courses/58dc843f984c63d67b7f3e4b?q=');

            /* Get everything in the body (a JSON object) */
            var courses = await page.evaluate(() => {
                return JSON.parse(document.querySelector('body').innerText);
            });

            await browser.close();

            /* Send the JSON object to the next function */
            clickbaitCallback(null, courses);

        } catch (puppeteerErr) {
            clickbaitCallback(puppeteerErr, null);
        }
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
        try {
            const browser = await puppeteer.launch({
                headless: true //change to true in prod!
            });

            const page = await browser.newPage();

            await page.goto(`https://byui.kuali.co/api/v1/catalog/course/58dc843f984c63d67b7f3e4b/${catalogCourse.pid}`);

            /* Retrieve the body of the page (a JSON object with the course's information) */
            var innerText = await page.evaluate(() => {
                return JSON.parse(document.querySelector('body').innerText);
            });

            await browser.close();

            /* Return the course's description found in the JSON object */
            getDescriptionCallback(null, innerText.description);

        } catch (puppeteerErr) {
            getDescriptionCallback(puppeteerErr, null);
        }
    }

    /*******************************************************
     * Send the description to canvas through a PUT request
     *******************************************************/
    function sendToCanvas(description, cb) {
        var putObj = {
            'course[public_description]': description
        };

        /* Update the course's description through a PUT request */
        canvas.put(`/api/v1/courses/${course.info.canvasOU}`, putObj, putErr => {
            if (putErr)
                cb(putErr);
            else
                cb(null);
        });
    }

    /**************************************************
     * Asynchronously call the functions in the module
     **************************************************/
    function runModule() {
        var catalogCourse = '';

        /* Call clickbait and return the JSON object with all course info objects (myJSON) */
        clickbait((err, catalogCourses) => {
            if (err) {
                course.error(err);
                stepCallback(null, course);
                return;
            }

            /* Set catalogCourse to the returned object from 
               parseMyJSON (one course's PID and Course Code) */
            catalogCourse = catalogCourses.find(catalogCourse => {
                return catalogCourse.__catalogCourseId.replace(/\s/g, '') == course.info.courseCode;
            });

            /* quit if unable to find course */
            if (catalogCourse === undefined) {
                course.warning('Unable to find a catalogCourseId. Exiting');
                stepCallback(null, course);
                return;
            }

            catalogCourse.pid = catalogCourse.pid.replace(/\s/g, '');

            /* Using the current course's PID and Course Code, get the description of the course */
            getDescription(catalogCourse, (err, description) => {
                if (err) {
                    course.error(err);
                    stepCallback(null, course);
                    return;
                }

                if (!description) {
                    course.warning('Unable to find course description at http://www.byui.edu/catalog/#/courses. Exiting');
                    stepCallback(null, course);
                    return;
                }

                /* If the course description was retrieved from http://www.byui.edu/catalog/#/courses, 
                   then send the description to Canvas */
                sendToCanvas(description, err => {
                    if (err) {
                        course.error(err);
                        stepCallback(null, course);
                        return;
                    }

                    /* Log the description and course ID */
                    course.log('Add Course Description', {
                        'Course ID': course.info.canvasOU,
                        'Course Description': description,
                    });

                    stepCallback(null, course);
                });
            });
        });
    }

    /************************************************
     *                  Start here                  *
     ************************************************/
    runModule();
};