var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');

var lineread = require('line-reader');
var fs = require('fs');
var async = require('async');
var wiky = require('wiky.js');
var wtf = require('wtf_wikipedia');
var txtwiki = require('txtwiki');

var app = express();

//global variable
var abstructs = [];
var totalAbs = 2356765;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

app.post('/search', function (req, res) {
    var query_list = JSON.parse(req.body.query);
    var query = query_list.words;
    var mode = query_list.mode;
    var ABS_MAX = 50;
    abstructs = [];

    readIndexFiles(query).then(function (data) {
        if(data.length == 0){
            res.write(JSON.stringify(data));
            res.end();
        }
        else {
            getArticles(data, ABS_MAX, mode).then(function (rdata) {

                rdata.sort(sortByOffset);

                res.write(JSON.stringify(rdata));
                res.end();
            });
        }
    });
});

// sort function
function sortByOffset(a, b){
    return b.degree - a.degree;
}

app.post('/readMore', function (req, res) {
    var offsetStr = JSON.parse(req.body.offset);
    var fReadName = process.cwd() + '\\public\\src\\enwikisource-20171020-pages-articles-multistream.xml';
    var offset = 0;
    for(var j=0; j<offsetStr.length; j++){
        offset = offset * 10;
        offset = offset + parseInt(offsetStr[j]);
    }
    var stream = fs.createReadStream(fReadName, { start: offset });
    var stringbuf;
    stream.on('data', function(chunk) {
        var endPos = chunk.indexOf('</page>');
        if(endPos >= 0){
            stringbuf += chunk.toString('utf8', 0, endPos);
            stream.close();
        }
        else{
            stringbuf += chunk.toString('utf8');
        }
    });
    stream.on('close', function () {
        stringbuf = stringbuf.split('<text xml:space="preserve">')[1];
        var plaintext = wiky.process(stringbuf, { 'link-image': false });
        res.write(JSON.stringify({body: plaintext}));
        res.end();
    })
});

//find index of a word
function readIndexFile(filename, word) {
    return new Promise(function(resolve) {
        var w_6;
        if(word.length == 1) w_6 = word + "00000";
        else if(word.length == 2) w_6 = word + "0000";
        else if(word.length == 3) w_6 = word + "000";
        else if(word.length == 4) w_6 = word + "00";
        else if(word.length == 5) w_6 = word + "0";
        else w_6 = word.substring(0,6);


        var begin = 0;
        for(var i=0; i<w_6.length-1; i++){
            begin *= 27;
            if(w_6.charCodeAt(i+1) != '0'.charCodeAt(0))
                begin += w_6.charCodeAt(i+1) - 'a'.charCodeAt(0) + 1;
        }

        var streamIndex = fs.createReadStream(filename, { start: begin * 21, end: begin * 21 + 20 });
        streamIndex.on('data', function(chunk) {
            streamIndex.close();
            var line = chunk.toString().split(' ');
            if(line[1][0] == '@')
                resolve(null);
            else resolve({word: word, begin: parseInt(line[1]) });
        });
        streamIndex.on('close', function () {

        });
        /*
        console.time("linereader");
        lineread.eachLine(filename, function (line, last) {
            if(line.split(" ")[0] == w_6){
                //console.log("findIndex");
                resolve({word: word, begin: parseInt(line.split(" ")[1]) });
            }
            else{
                if(last){
                    console.timeEnd("linereader");
                    resolve(null);
                }
            }
        });*/
    });
}

function readIndexFiles(words) {
    return new Promise(function (resolve) {
        var sz = words.length;
        var r = [];
        var i = 0;
        var fReadIndexIndex;
        async.whilst(
            function () { return i<sz; },
            function (callback) {
                fReadIndexIndex = process.cwd() + '\\public\\src\\output\\' + words[i][0] + '\\index';
                readIndexFile(fReadIndexIndex, words[i]).then(function (re) {
                    if(re){
                        r.push({
                            word: re.word,
                            begin: re.begin
                        });
                    }
                    else{
                        sz --;
                    }
                    if(r.length == sz){
                        resolve(r);
                    }
                });
                i ++;
                callback();
        });
    });
}

function getWordLine(wordpair, ABS_MAX) {
    return new Promise(function (resolve, reject) {
        var word = wordpair.word;
        var fReadIndex = process.cwd() + '\\public\\src\\output\\' + wordpair.word[0] + '\\-r-00000';
        var streamIndex = fs.createReadStream(fReadIndex, { start: wordpair.begin-1 });
        var extendRead = 0;
        var line = "";
        var abs_count = 0;
        console.time("getword:"+word);
        streamIndex.on('data', function(chunk) {
            if(extendRead){
                for(var i=0; i<chunk.length; i++){
                    if(chunk[i] == "\n".charCodeAt(0)){
                        line += chunk.toString('utf8', 0, i + 1);
                        streamIndex.close();
                        break;
                    }
                    else if(chunk[i] == ",".charCodeAt(0)){
                        abs_count ++;
                        if(abs_count > ABS_MAX){
                            line += chunk.toString('utf8', 0, i + 1);
                            streamIndex.close();
                            break;
                        }
                    }
                }
                if(i == chunk.length){
                    line += chunk.toString('utf8').replace(/\{(.*?)\}/g,"");
                }
            }
            else {
                var b;
                if(word.length == 1) b = chunk.indexOf(word+"\t");
                else b = chunk.indexOf("\n" + word + "\t");
                if(b>=0) {
                    var e = b + 1;
                    while (chunk[e] != "\n".charCodeAt(0) && abs_count <= ABS_MAX) {
                        e++;
                        if(e == chunk.length){
                            extendRead = 1;
                            break;
                        }
                        if(chunk[e] == ",".charCodeAt(0)) abs_count ++;
                    }
                    if(word.length == 1) line += chunk.toString('utf8', b , e).replace(/\{(.*?)\}/g,"");
                    else line += chunk.toString('utf8', b+1, e).replace(/\{(.*?)\}/g,"");
                    if(extendRead==0) streamIndex.close();
                }
            }
        });
        streamIndex.on('close', function () {
            console.timeEnd("getword:"+word);
            if(line.length == 0){
                reject();
            }
            else{
                line = line.replace(/\{(.*?)\}/g,"");
                resolve(line);
            }
        });
    });
}

function getArticle(wordpair, ABS_MAX, mode) {
    var fReadName = process.cwd() + '\\public\\src\\enwikisource-20171020-pages-articles-multistream.xml';
    return new Promise(function (resolve) {
        var word = wordpair.word;
        var fReadIndex = process.cwd() + '\\public\\src\\output\\' + word[0] + '\\-r-00000';
        var abs = [];
        getWordLine(wordpair, ABS_MAX).then(function (line) {
            var temp = line.split('\t');
            var w = temp[0];
            if(w == word && w.length == word.length){
                var s = temp[1].split(',');
                var wordDocNum = parseInt(s[0]);
                var i = 1;
                async.whilst(
                    function() { return i < s.length && i < ABS_MAX; },
                    function(callback) {
                        temp = s[i].split('[');
                        //get offset
                        var ss = temp[0];
                        var offset = 0;
                        for(var j=0; j<ss.length; j++){
                            offset = offset * 10;
                            offset = offset + parseInt(ss[j]);
                        }
                        var wordThisDoc = parseInt(temp[1].split(']')[0].split('.')[0]);
                        //get degree of relationship
                        var degree = Math.log(totalAbs / wordDocNum) / (wordThisDoc * Math.log(2));
                        var stream = fs.createReadStream(fReadName, { start: offset, end: offset + 3000 });
                        var stringbuf;
                        var title;
                        var time;
                        stream.on('data', function(chunk) {
                            var endPos = chunk.indexOf('</text>');
                            var titleBegin = chunk.indexOf('<title>') + "<title>".length;
                            var titleEnd = chunk.indexOf('</title>');
                            var timeBegin = chunk.indexOf('<timestamp>') + "<timestamp>".length;
                            var timeEnd = chunk.indexOf('</timestamp>');
                            var textBegin = chunk.indexOf('<text xml:space="preserve">') + '<text xml:space="preserve">'.length;

                            stringbuf = chunk.toString('utf8', textBegin, 3000);
                            var plaintext;
                            var html;
                            if(mode){
                                plaintext = txtwiki.parseWikitext(stringbuf + "]]");
                                html = getShortPreview(plaintext);
                            }
                            else{
                                html = "NonPreview mode now.";
                            }
                            //console.log(plaintext);

                            //get title
                            title = chunk.toString('utf8', titleBegin, titleEnd);
                            //get time
                            time = chunk.toString('utf8', timeBegin, timeEnd);
                            time = time.replace("T", " ");
                            time = time.replace("Z", " ");

                            var singleAbs = {
                                title: title,
                                time: time,
                                text: html,
                                offset: offset,
                                degree: degree
                            };
                            abs.push(singleAbs);
                            stream.close();
                            if(Math.min(s.length, ABS_MAX) - 1 == abs.length){
                                console.log(abs.length + " results founded about " + word);
                                resolve(abs);
                            }
                        });
                        i ++;
                        callback();
                    }
                );

            }
        }).catch(function () {
            resolve(null);
        });
    });
}

function getArticles(words, ABS_MAX, mode) {
    return new Promise(function (resolve) {
        var sz = words.length;
        var count = 0;
        var r = [];
        var i = 0;
        var k;
        async.whilst(
            function () { return i<sz; },
            function (callback) {
                getArticle(words[i], ABS_MAX, mode).then(function (re) {
                    if(re){
                        for(var j=0; j<re.length; j++){
                            for(k=0; k<r.length; k++){
                                if(re[j].offset == r[k].offset){
                                    r[k].degree += re[j].degree;
                                    break;
                                }
                            }
                            if(k == r.length){
                                r.push(re[j]);
                            }
                        }
                        count ++;
                    }
                    else{
                        sz --;
                    }
                    if(count == sz){
                        resolve(r);
                    }
                });
                i ++;
                callback();
            });
    });
}

function getPreview(stringbuf, info) {
    //options
    var html_length = 1000;

    var temphtml;
    var htmlsplit = [];
    var html = "";
    var j,k;

    if(!info.sections){
        html = "There is no preview about this article.";
        return html;
    }

    if(info.sections.length <= 1){
        temphtml = stringbuf.replace(/\{\{([\w\W]*?)\}\}/g, "");
        temphtml = temphtml.replace(/<([\w\W]*?)>/g, "");
        temphtml = temphtml.replace(/&lt;([\w\W]*?)&gt;/g, "");
        temphtml = temphtml.replace(/\[\[([\w\W]*?)\]\]/g, "");
        temphtml = temphtml.replace(/\(([\w\W]*?)\)/g, "");
        htmlsplit = temphtml.split(".");
        for(j=1; html.length<=html_length && htmlsplit[j]; j++){
            html += htmlsplit[j] + ".";
        }
        if(html.length < html_length) html = "There is no preview about this article.";
    }
    else{
        for(j=0; j<info.sections.length; j++){
            if(info.sections[j].title == "Abstract") break;
        }
        if(j >= info.sections.length){
            temphtml = stringbuf.replace(/\{\{([\w\W]*?)\}\}/g, "");
            temphtml = temphtml.replace(/<([\w\W]*?)>/g, "");
            temphtml = temphtml.replace(/&lt;([\w\W]*?)&gt;/g, "");
            temphtml = temphtml.replace(/\[\[([\w\W]*?)\]\]/g, "");
            temphtml = temphtml.replace(/\(([\w\W]*?)\)/g, "");
            htmlsplit = temphtml.split(".");
            for(j=1; html.length<=html_length && htmlsplit[j]; j++){
                html += htmlsplit[j] + ".";
            }
            if(html.length < html_length) html = "There is no preview about this article.";
        }
        else{
            for(k=0; html.length<=html_length; k++){
                if(!info.sections[j].sentences[k]) break;
                html += info.sections[j].sentences[k].text;
            }
        }
    }
    return html;
}

function getShortPreview(stringbuf) {
    //options
    var html_length = 750;
    var html_min = 500;

    var html = stringbuf.replace(/\{\{([\w\W]*?)\}\}/g, "");
    html = html.replace(/<([\w\W]*?)>/g, "");
    html = html.replace(/&lt;([\w\W]*?)&gt;/g, "");
    /*
    html = html.replace(/\[\[([\w\W]*?)\]\]/g, "");
    html = html.replace(/[\b]+?/g, " ");*/
    if(html.length <= html_min){
        html = "There is no preview about this article."
    }
    else if(html.length >= html_length){
        html = html.slice(0, html_length);
    }

    return html;
}

function getAuthorCategories(stringbuf, info) {
    var headPat = new RegExp(/\{\{header([\w\W]*?)\}\}/,'g');
    var head = stringbuf.match(headPat);
    var h;
    var headerpairs = [];
    var author = "Wzy";
    var categories = [];
    var headerpairsplit = [];
    if(head){
        h = head[0].replace(/([\s\{\}])+/g, " ");
        headerpairs = h.split("|");
        var j;
        for(j=0; j<headerpairs.length; j++){
            headerpairsplit = headerpairs[j].split(" = ");
            //console.log(headerpairsplit);
            if(headerpairsplit[0] == " author" && headerpairsplit[1]){
                author = headerpairsplit[1].slice(0, headerpairsplit[1].length - 1);
            }
            else if(headerpairsplit[0] == " override_author" && headerpairsplit[1]){
                author = headerpairsplit[1].slice(0, headerpairsplit[1].length - 1);
                author = author.replace("by ", "");
            }
            else if(headerpairsplit[0] == " categories" && headerpairsplit[1]){
                categories = headerpairsplit[1].slice(0, headerpairsplit[1].length - 1).split(" / ");
            }
        }
        for(j=0; j<info.categories; j++){
            categories.append(info.categories[j]);
        }
    }
    return {author: author, categories: categories};
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
