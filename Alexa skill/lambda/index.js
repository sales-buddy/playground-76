const Alexa = require('ask-sdk-core');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to the Appointment Booking Process. You can say, book an appointment, to begin.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Say, book an appointment, to start.')
            .getResponse();
    }
};

const jsforce = require('jsforce');
const moment = require('moment');

const SF_LOGIN_URL = 'https://login.salesforce.com';
const SF_CLIENT_ID = '3MVG9RGN2EqkAxhLofxTpzsLqbbPBeMjeNuCyig1xBP8Itvjnro.ym6wHs8B0DR8X6a8VwoK04SfNVyTdIVO0';
const SF_CLIENT_SECRET = '0039869FF3BC71BF1334E4D843B5A726C11D82BD895E89A99B0FEF14ACC46323';
const SF_USERNAME = 'kesava.mallikarjuna77-uysw@force.com';
const SF_PASSWORD = 'scheduler@&Org1';
const connectSalesforce = async () => {
    try {
        const conn = new jsforce.Connection({
            oauth2: {
                loginUrl: SF_LOGIN_URL,
                //clientId: SF_CLIENT_ID,
                //clientSecret: SF_CLIENT_SECRET
            }
        });
        await conn.login(SF_USERNAME, SF_PASSWORD);
        console.log('Successfully connected to Salesforce');
        return conn;
    } catch (error) {
        console.error('Error connecting to Salesforce:', error);
        throw error;
    }
};

const BookAppointmentIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getIntentName(handlerInput.requestEnvelope) === 'BookAppointmentIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Please provide your zip code to find your service territory.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const ZipCodeIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getIntentName(handlerInput.requestEnvelope) === 'ZipCodeIntent';
    },
    async handle(handlerInput) {
        try {
            const zipCode = handlerInput.requestEnvelope.request.intent.slots.zipCode.value;
            console.log(`Zip Code received: ${zipCode}`);

            const conn = await connectSalesforce();

            const territories = await conn.query(`SELECT Id, Name FROM ServiceTerritory WHERE Zip_Code__c='${zipCode}' LIMIT 1`);
            if (!territories.records.length) {
                const speakOutput = 'No service territory found for the entered zip code.';
                return handlerInput.responseBuilder.speak(speakOutput).getResponse();
            }

            const territory = territories.records[0];

            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            sessionAttributes.territoryId = territory.Id;

            const reasons = await conn.query(`SELECT Name FROM Worktype`);
            const reasonList = reasons.records.map(r => r.Name);

            const speakOutput = `Your service territory is ${territory.Name}. The available reasons for your visit are: ${reasonList}. Please state your reason.`;
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Please state your reason for visit.')
                .getResponse();
        } catch (error) {
            console.error('Error fetching territory or reasons:', error);
            return handlerInput.responseBuilder
                .speak('Error retrieving information. Please try again.')
                .getResponse();
        }
    }
};

const ReasonForVisitIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getIntentName(handlerInput.requestEnvelope) === 'ReasonForVisitIntent';
    },
    handle(handlerInput) {
        try{
        const reason = handlerInput.requestEnvelope.request.intent.slots.reason.value;

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.reason = reason;

        const speakOutput = 'Please provide your preferred appointment date and time.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('When would you like to schedule the appointment?')
            .getResponse();}
            catch (error) {
            console.error('Error retriving territory or reasons:', error);
            return handlerInput.responseBuilder
                .speak(error)
                .getResponse();
        }
    }
};

const ConfirmBookingIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConfirmBookingIntent';
    },
    async handle(handlerInput) {
        try {
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            const date = handlerInput.requestEnvelope.request.intent.slots.date.value;
            const time = handlerInput.requestEnvelope.request.intent.slots.time.value;

            const scheduledStart = moment(`${date} ${time}`).format();
            const conn = await connectSalesforce();

            await conn.sobject('ServiceAppointment').create({
                ServiceTerritoryId: sessionAttributes.territoryId,
                SchedStartTime: scheduledStart,
                Status: 'None',
                Description: sessionAttributes.reason
            });

            const speakOutput = `Your appointment has booked for ${moment(scheduledStart).format('MMMM DD YYYY, h:mm a')}. You will receive a confirmation email please check email.`;
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        } catch (error) {
            console.error('Error while booking appointment:', error);
            return handlerInput.responseBuilder.speak(error.message) // to  speakout the error for easy identifying yhe error
                //.speak('Error booking appointment. Please try again.')
                .getResponse();
        }
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        return intentName === 'AMAZON.CancelIntent' || intentName === 'AMAZON.StopIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.speak('Goodbye! Thanks').getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.error('Unhandled error:', error);
        const speakOutput = 'Sorry,Erro occurred during transaction. Please try again.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        BookAppointmentIntentHandler,
        ZipCodeIntentHandler,
        ReasonForVisitIntentHandler,
        ConfirmBookingIntentHandler,
        CancelAndStopIntentHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
