import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';
import { serviceAccount } from './iox-kiosk-firebase-adminsdk-835n3-840b1bf9c1';

const { dialogflow, SimpleResponse } = require('actions-on-google');

import { ConvoResponse } from './convo-response.interface';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    databaseURL: "https://iox-kiosk.firebaseio.com"
});

const app = dialogflow({ debug: true });

app.intent('input.welcome', (conv) => {
    return admin.database().ref('/settings').update({
        greeting: true
    })
        .then(() => {
            return conv.ask(new SimpleResponse(`<speak>Welcome to IO Extended Kuala Lumpur! <break time="0.7s"/> . Here's what you can do:</speak>`));
        });
});


app.intent('input.goodbye', (conv) => {
    return admin.database().ref('/settings').update({
        greeting: false
    })
        .then(() => clearResponse())
        .then(() => {
            return conv.close(new SimpleResponse(`<speak>Goodbye!<break time="0.7s"/> Enjoy the event and see you again!</speak>`));
        });
});

app.intent('request_wifi', (conv) => {
    return admin.database()
        .ref('/wifi')
        .once('value')
        .then(snapshot => snapshot.val())
        .then(wifi => {

            const convoResponse: ConvoResponse = {
                speech: `<speak>Here's the WiFi details!</speak>`,
                caption: 'WiFi Details:',
                displayMultiLine: [`SSID: ${wifi.ssid}`, `Password: ${wifi.password}`]
            }

            return saveResponseAndAsk(convoResponse, conv);
        });
});

app.intent('request_sponsor_list', (conv) => {
    return admin.database()
        .ref('/')
        .once('value')
        .then(snapshot => snapshot.val())
        .then(everything => {

            const { sponsors, partners, fans, love } = everything;
            const convoResponse: ConvoResponse = {
                intent: 'request_sponsor_list',
                speech: `<speak>
            <par>
              <media xml:id='question'>
                <speak>
                 <break time='2s'/> Here's the sponsors! <break time='3s'/>
                     Our mind-blowing supporters, Google and Sunway University.<break time='2s'/>
                  Next, its our awesome partners.<break time='1s'/>
                  MoneyLion, Nettium, Nintex, Agmo studio, iflix and <break strengh="none"/><prosody rate="medium"><emphasis level="moderate">time</emphasis></prosody> <break time='2s'/>
                  Next, Our hardcore fans are, Github and Jet Brains <break time='2s'/>
                  Finally, brought with love from GDG Kuala Lumpur and Sunway Tech Club
                
                </speak>
              </media>
              <media repeatDur='60s' soundLevel="-10B" end='question.end+0s' fadeOutDur="4s">
                <audio src="https://goo.gl/WufWZt"/>
              </media>
            </par>
          </speak>`,
                caption: `Here's the awesome people who made this event possible!`,
                payload: {
                    sponsors,
                    partners,
                    fans,
                    love
                }
            };

            return saveResponseAndAsk(convoResponse, conv);
        });
});

app.intent('list_schedule', (conv) => {
    return admin.database()
        .ref('/sessions')
        .once('value')
        .then(snapshot => snapshot.val())
        .then(sessions => {
            const sessionArray = Object.keys(sessions).map(k => sessions[k]);

            let groupedSession = {};
            sessionArray.forEach(session => {
                groupedSession[session.startTime] = groupedSession[session.startTime] || [];
                groupedSession[session.startTime].push(session);
            });

            const groupedSessionKey = Object.keys(groupedSession).map(k => Object.assign({}, { startTime: k, sessions: groupedSession[k] }));


            const convoResponse: ConvoResponse = {
                intent: 'list_schedule',
                speech: `<speak>
                        Here's the schedule for the day! You can get a copy of the schedule by scanning the QR Code!
                    </speak>`,
                caption: ``,
                payload: groupedSessionKey
            };

            return saveResponseAndAsk(convoResponse, conv);
        });
});
app.intent('take_picture', (conv) => {
    const convoResponse: ConvoResponse = {
        intent: 'take_picture',
        speech: `<speak>
                    Start posing! When you're ready, say
                    <prosody rate="medium" pitch="2st" volume="loud">Cheese</prosody>
                </speak>`,
        caption: `When you're ready, say cheese!`,
    };

    return saveResponseAndAsk(convoResponse, conv);
});

app.intent('cheese', (conv) => {
    const convoResponse: ConvoResponse = {
        intent: 'cheese',
        speech: `<speak><audio soundLevel="+10dB" src="https://goo.gl/z2JVPR">oh snapp</audio> Here you go! Did you like it?</speak>`,
        caption: `Here you go! Did you like it?`,
    };

    return saveResponseAndAsk(convoResponse, conv);
});

app.intent('cheese_cancel', (conv) => {
    const convoResponse: ConvoResponse = {
        intent: '',
        speech: `<speak>Welcome to IO Extended Kuala Lumpur! <break time="0.7s"/> . Here's what you can do:</speak>`,
        caption: `Welcome to IO Extended Kuala Lumpur!. Here's what you can do:`,
    };
    return saveResponseAndAsk(convoResponse, conv);
});

app.intent('cheese_no', (conv) => {
    const convoResponse: ConvoResponse = {
        intent: '',
        speech: `That's too bad. Do you want to take a picture again?`,
        caption: `That's too bad. Do you want to take a picture again?`,
    };
    return saveResponseAndAsk(convoResponse, conv);
});


app.intent('cheese_yes', (conv) => {
    const convoResponse: ConvoResponse = {
        intent: 'cheese_yes',
        speech: `<speak> <audio clipEnd="4s" soundLevel="+20dB" src="https://actions.google.com/sounds/v1/cartoon/wind_chimes.ogg">tadaa!</audio>Here's your picture! Scan this QR Code to download!</speak>`,
        caption: `Here's your picture! Scan this QR Code to download!`,
    };
    return saveResponseAndAsk(convoResponse, conv);
});

app.intent('current_schedule', (conv) => {
    return admin.database()
        .ref('/sessions')
        .once('value')
        .then(snapshot => snapshot.val())
        .then(sessions => {

            const currentMoment = moment().add(8,'hour');
            const sessionArray = Object.keys(sessions).map(k => sessions[k]);

            let groupedSession = {};
            sessionArray.forEach(session => {
                groupedSession[session.startTime] = groupedSession[session.startTime] || [];
                groupedSession[session.startTime].push(session);
            });
            const groupedSessionKey = Object.keys(groupedSession).map(k => Object.assign({}, { startTime: k, sessions: groupedSession[k] }));

            const currentSessions = groupedSessionKey.filter((s, index) => {
                if (index < groupedSessionKey.length - 1) {
                    return currentMoment.isBetween(moment(s.startTime, 'h:mma'), moment(groupedSessionKey[index + 1].startTime, 'h:mma'))
                }
                else {
                    return currentMoment.isBetween(moment(s.startTime, 'h:mma'), moment(s.startTime, 'h:mma').add(1, 'hour'));
                }
            });
            const laterSessions = groupedSessionKey.filter((s) => {
                return moment(s.startTime, 'h:mma').isSameOrAfter(currentMoment);
            })

            let speakConvo = '';
            let titleSpeakerText = [];
            if (currentSessions.length > 0) {

                titleSpeakerText = currentSessions[0].sessions.map((s, index) => {
                    if (s.speaker) {
                        return (index === currentSessions[0].sessions.length - 1 ? 'and ' : ' , ') + s.title + ' by ' + s.speakers.name + ' in ' + s.location + ' ';
                    }
                    else {
                        return  (index === currentSessions[0].sessions.length - 1 ? 'and' : ', ')+s.title;
                    }
                });
                speakConvo = `The sessions that are happening right now are ${titleSpeakerText.join("")}. `
            }

            let laterSessionsSpeakerText = [];
            if (laterSessions.length > 0) {
                laterSessionsSpeakerText = laterSessions[0].sessions.map((s, index) => {
                    if (s.speakers) {
                        return (index === currentSessions[0].sessions.length - 1 ? ' and' : ' , ')+ s.title + ' by ' + s.speakers.name + ' in ' + s.location + ' at ' + s.startTime ;
                    }
                    else {
                        return  (index === currentSessions[0].sessions.length - 1 ? ' and ' : ' , '+s.title + s.startTime);
                    }
                });
                speakConvo = speakConvo + `. Later, the sessions are  ${laterSessionsSpeakerText.join("")}. `
            }

            if (speakConvo === '') {
                speakConvo = `There aren't any sessions ongoing at the moment. Try asking for the schedule instead!`;
            }
            const convoResponse: ConvoResponse = {
                intent: 'current_schedule',
                speech: speakConvo,
                caption: ``,
                payload: {
                    currentSessions,
                    laterSessions
                }
            };

            return saveResponseAndAsk(convoResponse, conv);
        });
});

function saveResponseAndAsk(response: ConvoResponse, conv: any) {
    return admin.database()
        .ref('/response')
        .set(response)
        .then(() => conv.ask(new SimpleResponse(response.speech)));
}

function saveResponseAndEnd(response: ConvoResponse, conv: any) {
    return admin.database()
        .ref('/response')
        .set(response)
        .then(() => conv.end(new SimpleResponse(response.speech)));
}

function clearResponse() {
    return admin.database()
        .ref('/response')
        .remove();
}

export const helloWorld = functions.https.onRequest(app);
