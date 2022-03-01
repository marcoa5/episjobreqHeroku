var express = require('express');
var app = express();
var cors = require('cors')
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
var admin = require("firebase-admin");
var serviceAccount = require('./key.json')
const porta = process.env.PORT || 3001
const axios = require('axios')
var moment = require('moment');
const { auth } = require('firebase-admin');
const functions = require("firebase-functions");
const Handlebars = require("handlebars");
const fs = require('fs');
var html_to_pdf = require('html-pdf-node');
const firebase = require('firebase/app')
require('firebase/storage')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epi-serv-job-default-rtdb.firebaseio.com"
});

firebase.initializeApp({
    apiKey: "AIzaSyBtO5C1bOO70EL0IPPO-BDjJ40Kb03erj4",
    authDomain: "epi-serv-job.firebaseapp.com",
    databaseURL: "https://epi-serv-job-default-rtdb.firebaseio.com",
    projectId: "epi-serv-job",
    storageBucket: "epi-serv-job.appspot.com",
    messagingSenderId: "793133030101",
    appId: "1:793133030101:web:1c046e5fcb02b42353a05c",
    measurementId: "G-Y0638WJK1X"
  })
app.use(cors())
app.use(bodyParser.urlencoded({limit: '50000kb',extended: true}))
app.use(bodyParser.json({limit: '50000kb'}))
app.use(express.static(__dirname + '/public'));


app.get('/getusers', function(req,res){
    admin.auth().listUsers(1000).then((a)=>{
        res.send(a.users)
    })
})

app.get('/getuserinfo', function(req,res){
    var id = req.query.id
    admin.database().ref('Users/'+ id).once('value', a=>{
        res.status(200).send(a.val())
    })
})

app.get('/createuser', function(req,res){
    var Mail = req.query.Mail
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos
    var km = req.query.km
	var userVisit = req.query.userVisit
    admin.auth().createUser({
        email: Mail,
        emailVerified: false,
        password: 'Epiroc2021',
        disabled: false,
    })
    .then((userRecord) => {
        var Area = undefined
        let id = userRecord.uid
        if(req.query.Area!=undefined) Area = req.query.Area
        admin.database().ref('Users').child(id).child('Cognome').set(Cognome)
        admin.database().ref('Users').child(id).child('Nome').set(Nome)
        admin.database().ref('Users').child(id).child('Pos').set(Pos)
        admin.database().ref('Users').child(id).child('userVisit').set(userVisit)
        admin.database().ref('Users').child(id).child('Area').set(Area)
        .then(()=>res.status(200).send('ok'))
        .catch((error) => {
            res.status(300).send('Errore: ' + error)
        })
    })
    .catch((error) => {
        res.status(300).send('Errore: ' + error)

    });
})

app.all('/updateuser', function(req,res){
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos
    var id = req.query.id
	var userVisit = req.query.userVisit
    var Area = undefined
    if(req.query.Area!=undefined) Area = req.query.Area
    admin.database().ref('Users').child(id).child('Cognome').set(Cognome)
    admin.database().ref('Users').child(id).child('Nome').set(Nome)
    admin.database().ref('Users').child(id).child('Pos').set(Pos)
    admin.database().ref('Users').child(id).child('userVisit').set(userVisit)
    admin.database().ref('Users').child(id).child('Area').set(Area)
    .then(()=>res.status(200).send('ok'))
})

app.get('/delete',function(req,res){
    var id = req.query.id
    admin.auth().deleteUser(id)
    .then(()=>{
        admin.database().ref('Users/' + id).remove()
        .then(()=>{
            res.status(200).send('ok') 
         })
    })
    .catch(err=>{
        console.log(err)
    })
})


app.all('/mail', function(req, res,next) {
    var arg = req.query
    if(arg.to1!=undefined){
        transporter.sendMail(createMailOptions(arg), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(createMailOptionsIntProd(arg), (error, info)=>{
                    if (error) {
                    console.log(error);
                    } else {
                        res.status(200).send(arg.to1);
                    }
                })
            }
        });
    } else {
        res.send('Mail not sent')
    }
});

app.all('/mailmod', async function(req, res,next) {
    var arg = req.query
    let refPdf = admin.storage().ref().child(`${arg.userN} ${arg.userC}/${arg.fileN}.pdf`)
    await refPdf.put(arg.urlPdf)
    .then(()=>{
        refPdf.getDownloadURL().then(url=>{
            if(url) req.urlPdf = url
            let refMa = admin.storage().ref().child(`${arg.userN} ${arg.userC}/${arg.fileN}.ma`)
            refMa.put(arg.urlMa)
            .then(()=>{
                refMa.getDownloadURL().then(url=>{
                    if(url) req.urlMa = url
                })
            })
        })
    })
    setTimeout(() => {
        if(arg.to1!=undefined){
            transporter.sendMail(createMailOptions(arg), (error, info)=>{
                if (error) {
                console.log(error);
                } else {
                    transporter.sendMail(createMailOptionsIntProd(arg), (error, info)=>{
                        if (error) {
                        console.log(error);
                        } else {
                            res.status(200).send(arg.to1);
                        }
                    })
                }
            });
        } else {
            res.send('Mail not sent')
        }
    }, 1000);
    
})

app.all('/maildebug', async function(req, res,next) {
    var arg = req.query
    if(arg.to1!=undefined){
        transporter.sendMail(createMailOptions(arg), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(createMailOptionsInt(arg), (error, info)=>{
                    if (error) {
                    console.log(error);
                    } else {
                        res.status(200).send(arg.to1);
                    }
                })
            }
        });
    } else {
        res.send('Mail not sent')
    }
});

app.get('/certiq', function(req,res){
    console.log(req.query)
    let count = 0
    let code=''
    let machines=[]
    let lung=0
    let itemNr=[]
    let yesterday = req.query.day
    axios({
        method:'get',
        url: 'https://api.epiroc.com/certiq/v2/authentication/login?username=marco.arato@epiroc.com&password=Epiroc2019',
        headers: {
            'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74'
        }
    })
    .then(data=>{
        code=data.data.userCode
        console.log(code)
        axios({
            method:'get',
            url: 'https://api.epiroc.com/certiq/v2/machines',
            headers: {
                'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                'X-Auth-Token':code
            }
        })
        .then(info=>{
            machines= info.data.data
            lung = machines.length
            machines.forEach(sr=>{
                delete sr.machineId
                delete sr.machineCustomerCenter
                delete sr.machineType
                delete sr.rigConfigVersion
                delete sr.rigSoftwareVersion
                let t6 = sr.machineName
                let t7 = t6.split(/ - /g)
                sr.machineSerialNr = t7[1]
                delete sr.machineName
                let s1 = sr.machineSite.replace(/.\(.+/,'')
                sr.machineSite=s1
                axios({
                    method:'get',
                    url: 'https://api.epiroc.com/certiq/v2/machines/'+ sr.machineItemNumber +'/kpis/' + yesterday,
                    headers: {
                        'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                        'X-Auth-Token':code
                    }
                })
                .then(gg=>{
                    if(sr.machineSerialNr=='TMG19SED0497') console.log(gg)
                    sr.LastDayEngineHours = Math.round(gg.data.dailyUtilizationEngineHours)
                    axios({
                        method:'get',
                        url: 'https://api.epiroc.com/certiq/v2/machines/'+ sr.machineItemNumber +'/serviceStatus',
                        headers: {
                            'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                            'X-Auth-Token':code
                        }
                    })
                    .then((service)=>{
                        let s = service.data
                        count++
                        //console.log(count)
                        s.forEach(sd=>{
                            if(sd.serviceStatus=='Upcoming' && sd.serviceType=='Engine'){
                               sr.serviceStep = sd.serviceAccumulator
                               sr.hoursLeftToService = sd.hoursLeftToService
                               sr.servicePredictedDate = sd.servicePredictedDate
                            }
                        })
                        if(count==machines.length){res.json(machines)}
                    })
                })
            })
            
        })
        .catch(e=>console.log(e))
    })
    .catch(e=>console.log(e))
})

app.get('/partreq', cors(), function(req,res){
    createMailParts(JSON.parse(req.query.info))
    .then(a=>{
        transporter.sendMail(a, (error, info)=>{
            if (error) res.status(300).send(error)
            if(info) res.status(200).send(info)
        })
    })
})

app.all('/psdllp',function(req,res){
    let kt=0
    let a = req.query.parts
    let outP ={}
    let r = a.split(',')
    r.forEach(b=>{
        admin.database().ref('PSDItems').child(req.query.child).child(b).child('llp').once('value',p=>{
            outP[b]=({pn:b,llp: p.val()==null?0:parseFloat(p.val())})
            kt++
            if(r.length==kt) res.status(200).json(outP)
        })
    })
    
})

app.all('/sjPdf', function(req,res){
    var a = fs.readFileSync('./template.html','utf8')
    var templ = Handlebars.compile(a)
    let options = {width: '21cm', height: '29.7cm'};
    let file = {content: templ(req.body)}
    html_to_pdf.generatePdf(file,options).then((d)=>{
        res.end(d)
    })
})

app.post('/sjMa', function(req,res){
    res.send(req.body)
})

app.all('/sendSJNew', function(req,res){
    let g = req.body
    createMA(g)
    .then(urlMa=>{
        g.info.urlMa = urlMa
        console.log(g)
        createPDF(g).then(urlPdf=>{
            g.info.urlPdf = urlPdf
            admin.auth().getUser(g.userId).then(user=>{
                g.info.ccAuth = user.email
            })
        })
        .then(()=>{
            transporter.sendMail(createMailOptionsNewMA(g), (error, info)=>{
                if(error) res.status(300).send(error)
                if(info) {
                    transporter.sendMail(createMailOptionsNew(g), (error, info)=>{
                        if (error) res.status(300).send(error)
                        if(info) {
                            res.status(200).json({mailResult: info})             
                        }
                    })   
                }
            })
        })
    })
})

app.post('/saveOnSP', function(req,res){

})

app.all('/', function(req, res,next) {
    const welc = `
    <div style="position: fixed; top:0;left:0;display:flex; justify-content: center; align-items: center; width:100%; height:100%; background-color: rgb(66, 85, 99)">
        <h1 style="font-family: Arial; text-align:center; width: 100%; color: rgb(255,205,0)">Welcome to Epi_ Service Job Web Services</h1>
    </div>
    `
    res.status(200).send(welc);
    res.end();
});

app.all('*', function(req, res,next) {
    const welc = `
    <div style="position: fixed; top:0;left:0;display:flex; justify-content: center; align-items: center; width:100%; height:100%; background-color: rgb(66, 85, 99)">
        <h1 style="font-family: Arial; text-align:center; width: 100%; color: rgb(255,205,0)">404 - Sorry, page not found</h1>
    </div>
    `
    res.status(404).send(welc);
    res.end();
});

app.listen(porta, ()=>{
    console.log(`Running on port:${porta}`)
});







//FUNCTIONS

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'episerjob@gmail.com',
      pass: 'xvesvmaufsunnzvr' 
    }
  });


function createMailOptions(a){
    /*let n = a.userN + ' ' + a.userC
    let chFEA=false
    admin.database().ref('Tech').child(n).once('value',k=>{
        if(k.val().s.substring(0,6)=='F.E.A.') chFEA=true
    })*/

    const mailOptions = {
        from: 'Epiroc Service <episerjob@gmail.com>',
        replyTo: 'marco.fumagalli@epiroc.com',
        to: a.to1,
        cc: a.userM,
        subject: a.subject,
        text: `In allegato scheda lavoro relativa all'intervento effettuato dal nostro tecnico Sig. ${a.userN} ${a.userC}.\nVi ringraziamo qualora abbiate aderito al nostro sondaggio.\n\n\nRisultato sondaggio:\n\nOrganizzazione intervento: ${a.son1}\nConsegna Ricambi: ${a.son2}\nEsecuzione Intervento: ${a.son3}`,
        //html:mailBody,
        attachments: {
            filename: a.fileN? a.fileN + '.pdf': '',
            path: a.urlPdf? a.urlPdf : ''
        }
      };
      return mailOptions
}

function createMailOptionsInt(a){
    const mailOptions = {
        from: `${a.userN} ${a.userC} - Epiroc Service <episerjob@gmail.com>`,
        to: "marco.arato@epiroc.com", //"marco.fumagalli@epiroc.com"
        cc: "", //"mario.parravicini@epiroc.com; carlo.colombo@epiroc.com; marco.arato@epiroc.com",
        subject: a.subject,
        text: `Risultato sondaggio:\n\nOrganizzazione intervento: ${a.son1}\nConsegna Ricambi: ${a.son2}\nEsecuzione Intervento: ${a.son3} ${a.rap}\n\n\nRisk Assessment \n ${a.rAss}`,
        attachments: [
            {
                filename: a.fileN + '.pdf',
                path: a.urlPdf
            },
            {
                filename: a.fileN + '.ma',
                path: a.urlMa
            }
        ]
      };
      return mailOptions
}

function createMailOptionsIntProd(a){
    const mailOptions = {
        from: `${a.userN} ${a.userC} - Epiroc Service <episerjob@gmail.com>`,
        to: "marco.fumagalli@epiroc.com",
        cc: "mario.parravicini@epiroc.com; carlo.colombo@epiroc.com; marco.arato@epiroc.com",
        subject: a.subject,
        text: `Risultato sondaggio:\n\nOrganizzazione intervento: ${a.son1}\nConsegna Ricambi: ${a.son2}\nEsecuzione Intervento: ${a.son3} ${a.rap}\n\n\nRisk Assessment \n ${a.rAss}`,
        attachments: [
            {
                filename: a.fileN + '.pdf',
                path: a.urlPdf
            },
            {
                filename: a.fileN + '.ma',
                path: a.urlMa
            }
        ]
      };
      return mailOptions
}

function createPDF(b){
    return new Promise((res,rej)=>{
        var a = fs.readFileSync('./template.html','utf8')
        var templ = Handlebars.compile(a)
        let options = {width: '21cm', height: '29.7cm'};
        let file = {content: templ(b)}
        html_to_pdf.generatePdf(file,options).then((d)=>{
            let ref = firebase.default.storage().ref(b.author + '/' + b.info.fileName + '.pdf')
            ref.put(Uint8Array.from(Buffer.from(d)).buffer, {contentType: 'application/pdf'})
            .then(()=>{
                ref.getDownloadURL().then(url=>{
                    res(url)
                })
            })
        })
    })
}

function createMA(a){
    return new Promise((res,rej)=>{
        let ref = firebase.default.storage().ref(a.author + '/' + a.info.fileName + '.ma')
        ref.put(Uint8Array.from(Buffer.from(JSON.stringify(a))).buffer)
        .then(()=>{
            ref.getDownloadURL().then(url=>{
                res(url)
            })
        })
    })
}

function createMailOptionsNew(a){
    let cc=[]//'mario.parravicini@epiroc.com', 'marco.fumagalli@epiroc.com','carlo.colombo@epiroc.com','marco.arato@epiroc.com']
    if(!cc.includes(a.info.ccAuth)) cc.push(a.info.ccAuth)
    const mailOptionsNew = {
            from: `${a.author} - Epiroc Service <episerjob@gmail.com>`,
            replyTo: 'marco.fumagalli@epiroc.com',
            to: a.elencomail,
            cc: a.info.cc? cc.join(';'):'',
            subject: a.info.subject,
            text: `In allegato scheda lavoro relativa all'intervento effettuato dal nostro tecnico Sig. ${a.author}.\nVi ringraziamo qualora abbiate aderito al nostro sondaggio.\n\n\nRisultato sondaggio:\n\nOrganizzazione intervento: ${a.rissondaggio.split('')[0]}\nConsegna Ricambi: ${a.rissondaggio.split('')[1]}\nEsecuzione Intervento: ${a.rissondaggio.split('')[2]}`,
            attachments: {
                filename: a.info.fileName + '.pdf',
                path: a.info.urlPdf
            }
        }

    return (mailOptionsNew)
}

function createMailOptionsNewMA(a){
    const mailOptionsNewMA = {
            from: `${a.author} - Epiroc Service <episerjob@gmail.com>`,
            to: 'marco.fumagalli@epiroc.com',
            cc: 'marco.arato@epiroc.com; mario.parravicini@epiroc.com; carlo.colombo@epiroc.com',
            subject: a.info.subject,
            text: `Risultato sondaggio:\n\nOrganizzazione intervento: ${a.rissondaggio.split('')[0]}\nConsegna Ricambi: ${a.rissondaggio.split('')[1]}\nEsecuzione Intervento: ${a.rissondaggio.split('')[2]}\n\nRapporto:\n${a.rappl1}`,
            attachments: [{
                filename: a.info.fileName + '.ma',
                path: a.info.urlMa
            },
            {
                filename: a.info.fileName + '.pdf',
                path: a.info.urlPdf
            }]
        }

    return (mailOptionsNewMA)
}

var source=`
<p>Prego elaborare offerta {{#if shipAdd}} da inoltrare a{{#shipAdd}} {{name}} ({{mail}}){{/shipAdd}}{{/if}} per i ricambi sotto elencati (Cantiere: {{customer}} {{#if shipTo.address}} - {{shipTo.address}} {{/if}}) relativo alla macchina <strong>{{model}} (s/n: {{sn}})</strong> {{#if shipTo.cig}}- CIG: {{shipTo.cig}}{{/if}} {{#if shipTo.cup}} CUP: {{shipTo.cup}}{{/if}}<p>
<br>
<table style="border-collapse: collapse;">    
<tr>
        <th style="padding: 5px 20px;border: 1px solid black">Categorico</th>
        <th style="padding: 5px 20px;border: 1px solid black">Descrizione</th>
        <th style="padding: 5px 20px; text-align:center;border: 1px solid black">Q.tà</th>
    </tr>
    {{#Parts}}
    <tr>
        <td style="padding: 5px 20px;border: 1px solid black">{{pn}}</td>
        <td style="padding: 5px 20px;border: 1px solid black">{{desc}}</td>
        <td style="padding: 5px 20px; text-align:center;border: 1px solid black">{{qty}}</td>
    </tr>
    {{/Parts}}
</table>
`

var template=Handlebars.compile(source)



function createMailParts(a){
    let to=['nicola.megna@epiroc.com','marco.fumagalli@epiroc.com']
    let cc=['mario.parravicini@epiroc.com', 'marco.arato@epiroc.com', 'giordano.perini@epiroc.com']
    if(a.type=='CustomerSupport') {
        cc.push('marco.fumagalli@epiroc.com', 'cristiana.besana@epiroc.com')
    }
    return new Promise((res,rej)=>{
        var data = a
        let ind=0
        data['shipAdd']=[]
        if(a.shipTo && a.shipTo.cont.length>0){
            a.shipTo.cont.forEach(w=>{
                data['shipAdd'][ind]=w
                ind++
            })
        }
        getMailCc(a.origId, cc).then((a1)=>{
            if(a1) cc=a1
            getSAM(a.sn,cc)
            .then(a2=>{
                if(a2) cc=a2
                var html=template(data)
                var mailOptions = {
                    from: `${a.author} - Epiroc Service <episerjob@gmail.com>`,
                    replyTo: 'marco.fumagalli@epiroc.com',
                    to: a.type=="CustomerSupport"?to[0]:to[1],
                    cc: '' + cc.toString().replace(/,/g,'; '),// + (a.type=='CustomerSupport'?'; marco.fumagalli@epiroc.com; cristiana.besana@epiroc.com':'') + cc,
                    subject: a.type + ': New Parts request to '+ a.customer + ' - ' + a.model + ' (s/n: ' + a.sn + ')',
                    html: html,
                }
                if(mailOptions!=undefined) res(mailOptions)              
            })
        })
    })
}

function getMailCc(a, cc){
    return new Promise((res,rej)=>{
        admin.auth().getUser(a).then(b=>{
            admin.database().ref('Users').child(b.uid).child('Pos').once('value',g=>{
                if(g!=null && (g.val()=='tech' || g.val()=='sales') && !cc.includes(b.email)) cc.push(b.email)
                res(cc)
            })
        })
    })
    
}

function getSAM(a,cc){
    return new Promise((res,rej)=>{
        setTimeout(() => {
            res(cc)
        }, 10000);
        admin.database().ref('RigAuth').child(a).once('value', h=>{
            let f = Object.values(h.val())
            let index = 0
            h.forEach(t=>{
                if(t.val()=='1' && t.key.substring(1,3)<50) {
                    admin.database().ref('Users').once('value',l=>{
                        l.forEach(de=>{
                            if(de.val().Area==t.key.substring(1,3)){
                                admin.auth().getUser(de.key).then(s=>{
                                    if(!cc.includes(s.email)) {
                                        cc.push(s.email)
                                        index++
                                    }
                                })
                            } else {index++}
                        })
                    })
                } else {index++}
                if (index==f.length ) res(cc)
            })
        })
    })
}