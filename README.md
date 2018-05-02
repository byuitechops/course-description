# Course Description
### *Package Name*: course-description
### *Child Type*: post
### *Platform*: online, campus
### *Required*: Recommended

This child module is built to be used by the Brigham Young University - Idaho D2L to Canvas Conversion Tool. It utilizes the standard `module.exports => (course, stepCallback)` signature and uses the Conversion Tool's standard logging functions. You can view extended documentation [Here](https://github.com/byuitechops/d2l-to-canvas-conversion-tool/tree/master/documentation).

## Purpose

The main purpose of this child module is to grab the course description from the BYU-Idaho Course Catalog, and put it into the description box in Canvas.

## How to Install

```
npm install course-description
```

## Run Requirements

The course object needs to have a valid `course.info.courseCode` value

## Options

None

## Outputs

None

## Process

Describe in steps how the module accomplishes its goals.

1. Using Puppeteer, get the information for every course in a JSON format from BYU-Idaho's API
2. Parse the JSON object to get just the Course Code and PID for the current course
3. Using Puppeteer, get the course description using the PID and Course Code
4. PUT the course description to Canvas

## Log Categories

- Add Course Description

## Requirements

This Child Module needs to fill the description area for the course on Canvas using the course description found at http://www.byui.edu/catalog/#/courses