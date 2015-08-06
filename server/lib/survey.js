"use strict";
var moment = require("moment");

var likertScale = [
    'trifft zu',
    'trifft eher zu',
    'teils-teils',
    'trifft eher nicht zu',
    'trifft nicht zu'
];

var surveyQuestions = [
    {},
    {
        id: 10,
        questions: [
            {
                id: 1010,
                text: 'Wie oft haben Sie die App letzte Woche geöffnet?',
                options: []
            },
            {
                id: 1020,
                text: 'Wie viele Routen haben Sie in der letzten Woche nachgeschaut?', options: []
            },
            {
                id: 1030,
                text: 'Wie viele Minuten haben Sie die App letzte Woche insgesamt genutzt?',
                options: []
            },
            {
                id: 10002,
                text: '“Ich finde die App im Alltag nützlich”',
                options: likertScale
            },
            {
                id: 10003,
                text: '“Die App ist einfach zu bedienen”',
                options: likertScale
            },
            {

                id: 10001,
                text: 'Alter',
                options: ['16 - 20 Jahre',
                    '21 – 23 Jahre',
                    '24 - 28 Jahre',
                    '29 - 35 Jahre',
                    '36 - 45 Jahre',
                    '45 - 60 Jahre',
                    '60 – 99 Jahre']
            }
        ]
    },
    {
        id: 20,
        questions: [
            {
                id: 2010,
                text: 'Wie oft haben Sie die App letzte Woche geöffnet?',
                options: [
                    'Mehr als einmal täglich',
                    'Einmal pro Tag',
                    'Mehrmals pro Woche',
                    'Einmal pro Woche',
                    'Niemals'
                ]
            },
            {
                id: 2020,
                text: 'Wie häufig haben Sie Routen in der letzten Woche nachgeschaut?',
                options: [
                    'Mehr als einmal täglich',
                    'Einmal pro Tag',
                    'Mehrmals pro Woche',
                    'Einmal pro Woche',
                    'Niemals'
                ]
            },
            {
                id: 2030,
                text: 'Wie lang haben Sie die App letzte Woche insgesamt genutzt?',
                options: [
                    'Für eine sehr lange Dauer',
                    'Für längere Zeit',
                    'Nicht besonders lange',
                    'Eher kurz',
                    'Sehr kurz'
                ]
            },
            {
                id: 20002,
                text: '“Ich finde die App im Alltag nützlich”',
                options: likertScale
            },
            {
                id: 20003,
                text: '“Die App ist einfach zu bedienen”',
                options: likertScale
            },
            {

                id: 20001,
                text: 'Alter',
                options: ['16 - 20 Jahre',
                    '21 – 23 Jahre',
                    '24 - 28 Jahre',
                    '29 - 35 Jahre',
                    '36 - 45 Jahre',
                    '45 - 60 Jahre',
                    '60 – 99 Jahre']
            }
        ]
    },
    {
        id: 30,
        questions: [
            {
                id: 3010,
                text: '“Letzte Woche habe ich die App jeden Tag benutzt.”',
                options: likertScale
            },
            {
                id: 3020,
                text: '“Letzte Woche habe ich viele Busrouten nachgeschaut.”',
                options: likertScale
            },
            {
                id: 3030,
                text: '“Letzte Woche habe ich die App für eine lange Dauer genutzt.“',
                options: likertScale
            },
            {
                id: 30002,
                text: '“Ich finde die App im Alltag nützlich”',
                options: likertScale
            },
            {
                id: 30003,
                text: '“Die App ist einfach zu bedienen”',
                options: likertScale
            },
            {

                id: 30001,
                text: 'Alter',
                options: ['16 - 20 Jahre',
                    '21 – 23 Jahre',
                    '24 - 28 Jahre',
                    '29 - 35 Jahre',
                    '36 - 45 Jahre',
                    '45 - 60 Jahre',
                    '60 – 99 Jahre']
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

        var surveyWeek = Math.floor(daysSince / 7);
        console.log(surveyWeek, "<-- surveyWeek");

        if (surveyWeek > 3) {
            surveyWeek = 3;
        }
        //console.log(group_id, "<-- group_id");

        //var surveyPlan = {
        //    1: [0, 1, 2, 3],
        //    2: [0, 2, 1, 3],
        //    3: [0, 3, 2, 1]
        //};

        var surveyPlan = {
            1: [0, 1, 2, 3],
            2: [0, 2, 1, 3],
            3: [0, 3, 2, 1]
        };
        //console.log(surveyPlan[group_id][surveyWeek], "<-- surveyPlan[group_id][surveyWeek]");
        //console.log(surveyQuestions[2], "<-- surveyQuestions");

        var chosenSurvey = surveyQuestions[surveyPlan[group_id][surveyWeek]];
        if (chosenSurvey.hasOwnProperty('id')) {
            chosenSurvey.disclaimer1 = "Die Umfrage wird im Rahmen eines Forschungsprojekts der Universität Göttingen durchgeführt.";
            chosenSurvey.disclaimer2 = "Persönliche Daten werden weder abgefragt noch gespeichert.";
            chosenSurvey.disclaimer3 = "Alle Angaben werden verschlüsselt und anonymisiert übertragen und in keinem Fall an Dritte weitergegeben.";
            chosenSurvey.title = 'Mini-Umfrage';
            chosenSurvey.description = 'Umfrage abgeschlossen ?';

        }
        cb(null, chosenSurvey);
    }
};

