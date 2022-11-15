var express = require('express');
var app = express();
var cors = require('cors')
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
var admin = require("firebase-admin");
var admingrc = require("firebase-admin");
const porta = process.env.PORT || 3001
const axios = require('axios')
const Handlebars = require("handlebars");
const fs = require('fs');
var html_to_pdf = require('html-pdf-node');
const firebase = require('firebase/app')
const firebasegrc = require('firebase/app');
const { config } = require('process');
require('firebase/storage')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'episerjob@gmail.com',
      pass: 'xvesvmaufsunnzvr' 
    }
  });

  var source=`
  <p>Prego elaborare offerta per i ricambi sotto elencati
  {{#if shipAdd}}<br> da inoltrare a{{#shipAdd}} {{name}} ({{mail}}){{/shipAdd}}{{/if}} 
  <br>Destinatario: {{customer}} {{#if shipTo.address}} - {{shipTo.address}} {{/if}}
  <br>Macchina: <a href="https://episjobadmin.web.app/machine;sn={{sn}}"><strong>{{model}} (s/n: {{sn}})</strong></a>
  {{#if shipTo.cig}}<br>CIG: {{shipTo.cig}}{{/if}} {{#if shipTo.cup}} CUP: {{shipTo.cup}}{{/if}}<p>
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
  
  
  
  var sourceImi=`
  <p>Prego ordinare i seguenti ricambi relativi alla macchina <strong>{{model}} (s/n: {{sn}})</strong><p>
  <br>
  <p>Copiare ed incollare la seguente lista in ShopOnLine:</p>
  <table style="border-collapse: collapse;">    
  <!--<tr>
          <th style="padding: 5px 20px;border: 1px solid black">Categorico</th>
          <th style="padding: 5px 20px; text-align:center;border: 1px solid black">Q.tà</th>
          <th style="padding: 5px 20px;border: 1px solid black">Descrizione</th>
      </tr>-->
      {{#Parts}}
      <tr>
          <td style="padding: 5px 20px;border: 1px solid black">{{pn}}</td>
          <td style="padding: 5px 20px; text-align:center;border: 1px solid black">{{qty}}</td>
          <td style="padding: 5px 20px;border: 1px solid black">{{desc}}</td>
      </tr>
      {{/Parts}}
  </table>
  `
  
  var templateImi=Handlebars.compile(sourceImi)

exports.createMailOptions  = function(a){
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

exports.createMailOptionsInt= function(a){
    const mailOptions = {
        from: `${a.userN} ${a.userC} - Epiroc Service <episerjob@gmail.com>`,
        to: "marco.arato@epiroc.com", //"marco.fumagalli@epiroc.com"
        cc: "", //"mario.parravicini@epiroc.com; carlo.colombo@epiroc.com; marco.arato@epiroc.com",
        replyTo: 'marco.fumagalli@epiroc.com',
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

exports.createMailOptionsIntProd = function(a){
    const mailOptions = {
        from: `${a.userN} ${a.userC} - Epiroc Service <episerjob@gmail.com>`,
        replyTo: 'marco.fumagalli@epiroc.com',
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

exports.createPDF = function(b){
    return new Promise((res,rej)=>{
        var a = fs.readFileSync('../template/template.html','utf8')
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

exports.createMA = function(a){
    return new Promise((res,rej)=>{
        if(a.info.fileName){
            let ref = firebase.default.storage().ref(a.author + '/' + a.info.fileName + '.ma')
            ref.put(Uint8Array.from(Buffer.from(JSON.stringify(a))).buffer)
            .then(()=>{
                ref.getDownloadURL().then(url=>{
                    res(url)
                })
            })  
        }
    })
}

exports.createMailOptionsNew = function(a){
    let cc=[]
    if(!cc.includes(a.info.ccAuth)) cc.push(a.info.ccAuth)
    let tech='tecnico Sig. ' + a.author
    if(a.author=='Officina Vernia') tech='Service Partner Officina Vernia'
    const mailOptionsNew = {
            from: `${a.author} - Epiroc Service <episerjob@gmail.com>`,
            replyTo: 'marco.fumagalli@epiroc.com',
            to: a.elencomail,
            cc: a.info.cc? cc.join(';'):'',
            subject: a.info.subject,
            text: `In allegato scheda lavoro relativa all'intervento effettuato dal nostro ${tech}.\nVi ringraziamo qualora abbiate aderito al nostro sondaggio.\n\n\nRisultato sondaggio:\n\nOrganizzazione intervento: ${a.rissondaggio.split('')[0]}\nConsegna Ricambi: ${a.rissondaggio.split('')[1]}\nEsecuzione Intervento: ${a.rissondaggio.split('')[2]}`,
            attachments: {
                filename: a.info.fileName + '.pdf',
                path: a.info.urlPdf
            }
        }
    return (mailOptionsNew)
}

exports.createMailOptionsNewMA =function(a){
    const mailOptionsNewMA = {
            from: `${a.author} - Epiroc Service <episerjob@gmail.com>`,
            replyTo: 'marco.fumagalli@epiroc.com',
            to: 'marco.fumagalli@epiroc.com',
            cc: a.info.cc?'marco.arato@epiroc.com; mario.parravicini@epiroc.com; carlo.colombo@epiroc.com':'',
            subject: a.info.subject,
            text: `Risultato sondaggio:\n\nOrganizzazione intervento: ${a.rissondaggio.split('')[0]}\nConsegna Ricambi: ${a.rissondaggio.split('')[1]}\nEsecuzione Intervento: ${a.rissondaggio.split('')[2]}\n\nRapporto:\n${a.rappl1} ${a.oss1!=''? '\n\nOsservazioni:\n' + a.oss1: ''}`,
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

exports.createMailParts=function(a){
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

exports.createMailPartsImi=function(a){
    let to=['marco.arato@epiroc.com','marco.fumagalli@epiroc.com']//['andrea.dizioli@imifabi.com','francesco.viviani@imifabi.com']
    let cc=['']//['mario.parravicini@epiroc.com', 'marco.arato@epiroc.com', 'marco.fumagalli@epiroc.com', 'carlo.colombo@epiroc.com', 'giorgio.rizzi@epiroc.com']
    return new Promise((res,rej)=>{
        var html=templateImi(a)
        var mailOptions = {
            from: `${a.author} - Epiroc Service <episerjob@gmail.com>`,
            replyTo: 'marco.fumagalli@epiroc.com',
            to: to.toString().replace(/,/g,'; '),
            cc: cc.toString().replace(/,/g,'; '),
            subject: 'Epiroc Service: New Parts request for '+ a.model + ' (s/n: ' + a.sn + ')',
            html: html,
        }
        if(mailOptions!=undefined) res(mailOptions) 
    })
}

function getMailCc(a, cc){
    return new Promise((res,rej)=>{
        admin.app('default').auth().getUser(a).then(b=>{
            admin.app('default').database().ref('Users').child(b.uid).child('Pos').once('value',g=>{
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
        admin.app('default').database().ref('RigAuth').child(a).once('value', h=>{
            let f = Object.values(h.val())
            let index = 0
            h.forEach(t=>{
                if(t.val()=='1' && t.key.substring(1,3)<50) {
                    admin.app('default').database().ref('Users').once('value',l=>{
                        l.forEach(de=>{
                            if(de.val().Area==t.key.substring(1,3)){
                                admin.app('default').auth().getUser(de.key).then(s=>{
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

exports.createPDFgrc = function(b){
    return new Promise((res,rej)=>{
        var a = fs.readFileSync('../template/templategrc.html','utf8')
        var templ = Handlebars.compile(a)
        let options = {width: '21cm', height: '29.7cm'};
        let file = {content: templ(b)}
        html_to_pdf.generatePdf(file,options).then((d)=>{
            let ref = firebase.app('grc').storage().ref(b.author + '/' + b.info.fileName + '.pdf')
            ref.put(Uint8Array.from(Buffer.from(d)).buffer, {contentType: 'application/pdf'})
            .then(()=>{
                ref.getDownloadURL().then(url=>{
                    res(url)
                })
            })
        })
    })
}

exports.createPDFforApprovalgrc = function(b){
    return new Promise((res,rej)=>{
        var a = fs.readFileSync('../template/templategrc.html','utf8')
        var templ = Handlebars.compile(a)
        let options = {width: '21cm', height: '29.7cm'};
        let file = {content: templ(b)}
        html_to_pdf.generatePdf(file,options).then((d)=>{
            let ref = firebase.app('grc').storage().ref('Closed/' + b.info.fileName + '.pdf')
            ref.put(Uint8Array.from(Buffer.from(d)).buffer, {contentType: 'application/pdf'})
            .then(()=>{
                ref.getDownloadURL().then(url=>{
                    console.log('saved')
                    res(url)
                })
            })
        })
    })
}

exports.createMailOptionsNewgrc = function(a){
    let cc=[]
    cc.push('dimitris.nikolakopoulos@epiroc.com')
    cc.push('marco.arato@epiroc.com')
    if(!cc.includes(a.info.ccAuth)) cc.push(a.info.ccAuth)
    let tech= a.author
    const mailOptionsNew = {
            from: `${a.author} - Epiroc Service GRC <episerjob@gmail.com>`,
            replyTo: 'dimitris.nikolakopoulos@epiroc.com',
            to: a.elencomail,
            cc: a.info.cc? cc.join(';'):'',
            subject: a.info.subject,
            text: `Please find attached Service Job by Epiroc techinician Mr. ${tech}.\nThank you for completing the survey.\n\n\nSurvey Results:\n\nPlanning: ${a.rissondaggio.split('')[0]}\nParts Delivery: ${a.rissondaggio.split('')[1]}\nExecution: ${a.rissondaggio.split('')[2]}`,
            attachments: {
                filename: a.info.fileName + '.pdf',
                path: a.info.urlPdf
            }
        }

    return (mailOptionsNew)
}