var util = require('util'),
    Parser = require('./').Parser;

var ARecord = new Parser()
    .array('ipv4', {
        type: 'uint8',
        length: 4,
        formatter: function(arr) { return arr.join('.'); }
    });

// Fully qualified domain name, as per http://tools.ietf.org/html/rfc1035 @ 4.1.4
var fqdnPart = new Parser()
    .uint8('len')
    .string('label', {
        length: function() { return (this.len >> 6 === 3 ? 1 : this.len); }
    });
var fqdn = new Parser()
    .array('fqdnParts', {
        type: fqdnPart,
        readUntil: function(lastItem, buf) {
            // Read parts until a null byte or ptr has been read.
            return lastItem.len === 0 || (lastItem.len >> 6) === 3;
        }
    });

var fqdnFormatted = new Parser()
    .nest('name', { type: fqdn, formatter: function(fqdn) {
        var partArr = [], parts = fqdn.fqdnParts;
        parts.forEach(function(part) { if (part.len > 0) partArr.push(part.label) });
        return partArr.join('.');
    }});


var ipv4Buf = new Buffer([0xc0, 0xa8, 0x01, 0x0c]);
console.log(ARecord.parse(ipv4Buf));

var qname = new Buffer([0x0b, 0x5f, 0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x63, 0x61, 0x73, 0x74, 0x04, 0x5f, 0x74, 0x63, 0x70, 0x05, 0x6c, 0x6f, 0x63, 0x61, 0x6c, 0x00]);
console.log(fqdnFormatted.parse(qname));


var TXTRecord = new Parser()
    .string('txt', { length: '$parent.recordLen' });

var dnsAnswer = new Parser()
    .uint16be('type')
    .uint16be('recordLen')
    .choice('record', {
        tag: 'type',
        choices: {
            0x10: TXTRecord
        },
        defaultChoice: new Parser().string('default', { length: '$parent.recordLen' }) //rdlength is undefined
    });

var answer1 = new Buffer([0x00, 0x10, 0x00, 0x03, 0x61, 0x3D, 0x62]);
var answer2 = new Buffer([0x00, 0x00, 0x00, 0x03, 0x61, 0x3D, 0x62]);

console.log(dnsAnswer.parse(answer1));
console.log(dnsAnswer.parse(answer2));