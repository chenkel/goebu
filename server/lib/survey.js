"use strict";
var moment = require("moment");

var surveyQuestions = [
    // die nullte Woche
    {},
    {
        id: 1,
        title: 'Mini-Umfrage',
        description: 'Schon fertig ? ',
        questions: [
            {
                id: 1001,
                text: 'How many times do you use the app on a typical day?',
                options: []
            },
            {
                id: 1002,
                text: 'How many routes are you looking up on a typical day?', options: []
            },
            {
                id: 1003,
                text: 'For how long (in minutes) are using the app on a typical day?',
                options: []
            },
            {
                id: 3004,
                text: 'How often are you looking up your typically used route?',
                options: []
            }
        ]
    },
    {
        id: 2,
        title: 'Mini-Umfrage für Simon',
        description: 'Schon fertig, Dr. Trang ? ',
        questions: [
            {
                id: 2001,
                text: 'How many times do you use the app on a typical day?',
                options: []
            },
            {
                id: 2002,
                text: 'How many routes are you looking up on a typical day?', options: []
            },
            {
                id: 2003,
                text: 'How often do you use the app?',
                options: [
                    'More than once a day',
                    'Once a day',
                    'Several times a week',
                    'Several times a month',
                    'Never'
                ]
            },
            {
                id: 2004,
                text: '"I often look up my typically used route"',
                options: [
                    'Strongly agree',
                    'Agree',
                    'Neither agree nor disagree',
                    'Disagree',
                    'Strongly disagree'
                ]
            }
        ]
    },
    {
        id: 3,
        title: 'Mini-Umfrage',
        description: 'Buhaa ? ',
        questions: [
            {
                id: 3001,
                text: 'How many times do you use the app on a typical day?',
                options: [
                    'AAAAAAA',
                    'ZZZZZZZ'
                ]
            },
            {
                id: 3002,
                text: 'How many routes are you looking up on a typical day?',
                options: []
            },
            {
                id: 3003,
                text: 'For how long (in minutes) are using the app on a typical day?',
                options: [
                    'More than once a day',
                    'Once a day',
                    'Several times a week',
                    'Several times a month',
                    'Never'
                ]
            },
            {
                id: 3004,
                text: 'How often are you looking up your typically used route?',
                options: [
                    'Strongly agree',
                    'Agree',
                    'Neither agree nor disagree',
                    'Disagree',
                    'Strongly disagree'
                ]
            }
        ]
    }
];

module.exports = {
    returnSurveyByTimeAndGroup: function (unixTime, group_id, cb) {
        var firstTimeOpened = moment.unix(unixTime);
        var now = moment();
        var duration = moment.duration(now.diff(firstTimeOpened));
        var daysSince = duration.asDays();

        var surveyWeek = Math.floor(daysSince / 6);
        if (surveyWeek > 3){
            surveyWeek = 3;
        }
        //console.log(group_id, "<-- group_id");
        //console.log(surveyWeek, "<-- surveyWeek");


        //var surveyPlan = {
        //    1: [0, 1, 2, 3],
        //    2: [0, 2, 1, 3],
        //    3: [0, 3, 2, 1]
        //};

        var surveyPlan = {
            1: [2, 1, 2, 3],
            2: [2, 2, 1, 3],
            3: [2, 3, 2, 1]
        };
        //console.log(surveyPlan[group_id][surveyWeek], "<-- surveyPlan[group_id][surveyWeek]");
        //console.log(surveyQuestions[2], "<-- surveyQuestions");


        cb(null, surveyQuestions[surveyPlan[group_id][surveyWeek]]);
    }
};

