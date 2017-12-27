/**
 * Created by 42924 on 2017/12/4.
 */
var local_abs = [];
var page;

//options
var articles_per_page = 10;
var MAX_CATEGORIES = 3;
var QUERY_WORD_NUM = 10;
var PREVIEW = true;

//const var
var COLOR_TABLE = [
    "red","orange","yellow","olive","green","teal","blue","violet","purple","pink","brown","grey","black"
];
var CATEGORIES_COLOR_TABLE = ["red","orange","blue"];
var COLOR_NUM = 13;
var CATEGORIES_COLOR_NUM = 3;

function OnSearch(){
    $('.ui.basic.modal')
        .modal('show')
    ;
}

function GetWord() {
    var query = document.getElementById('in');
    var w = query.value.split(" ");
    var sz = w.length;
    if(sz.length == 0) return;
    var query_words = [];
    for(var i=0; i<Math.min(sz, QUERY_WORD_NUM); i++){
        query_words[i] = w[i].toLowerCase();
    }

    var query_list = {
        words: query_words,
        mode: PREVIEW
    };

    var xmlhttp;
    xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if(xmlhttp.readyState==4 && xmlhttp.status==200) {
            var r = xmlhttp.responseText;
            local_abs = JSON.parse(r);
            if(local_abs.length == 0){
                show_empty_abs();
            }
            else{
                page = 0;
                show_abs(0);
                setProgress(page + 1, parseInt((local_abs.length - 1) / articles_per_page + 1));
            }
        }
    };
    xmlhttp.open("POST","/search",true);
    xmlhttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
    xmlhttp.send("query=" + JSON.stringify(query_list));
}

function show_abs(page) {
    if(page > (local_abs.length - 1) / articles_per_page) return;
    var d = document.getElementById('show_result');
    var htmlcontent = "";
    var t;
    for(var i=articles_per_page * page; i<Math.min(local_abs.length, articles_per_page * (page + 1)); i++){
        if(local_abs[i].title.length >= 90){
            t = local_abs[i].title.substring(0, 90);
            t += "...";
        }
        else t = local_abs[i].title;
        htmlcontent += addSegment(t, local_abs[i].text, local_abs[i].time, [], local_abs[i].offset, local_abs[i].degree);
    }
    d.innerHTML = htmlcontent;
}

function show_empty_abs(){
    var d = document.getElementById('show_result');
    d.innerHTML = "<div class=\"ui info message\"><div class=\"header\">" +
        "没有找到相关文章。您可以尝试：" + "</div><ul class=\"list\">" +
        "<li>使用更多关键词</li>" +
        "<li>更换意思相近的关键词</li>" +
        "<li>不要只使用广泛出现的词，如“and”、“in”等</li>" +
        "</ul></div>";
    setProgress(1,1);
}

/*
 .ui.teal.segment
 h2.ui.font-sans-serif.margin-zero.padding-zero
 | Introducing Pure
 h4.ui.font-sans-serif.margin-10px-top-bottom
 |  >> By
 a.ui.font-sans-serif(href='#')
 |  Tilo Mitra
 h4.ui.horizontal.divider.header
 |   Preview
 p.font-sans-serif
 | Yesterday at CSSConf, we launched Pure – a new CSS library. Phew! Here are the slides from the presentation. Although it looks pretty minimalist, we’ve been working on Pure for several months. After many iterations, we have released Pure as a set of small, responsive, CSS modules that you can use in every web project.
 h4.ui.fitted.divider
 .height-30px.margin-10px-top
 button.ui.left.floated.tiny.teal.basic.button Read More
 button.ui.right.floated.tiny.teal.basic.button css
 button.ui.right.floated.tiny.teal.basic.button Javascript
 */

//Build a new segment
function addSegment(title, text, author, tags, offset, degree) {
    var titlestr = "<h2 class='ui font-sans-serif margin-zero padding-zero'>" + title + "</h2>";
    var authorstr = "<h4 class='ui font-sans-serif margin-10px-top-bottom'> >> <a class='ui font-sans-serif' href='#'>" + author + "</a></h4>";
    var aheaddivider = "<h4 class='ui horizontal divider header'> Preview </h4>";
    var textstr = "<p class='font-sans-serif'>" + text + "</p>";
    var beforedivider = "<h4 class='ui fitted divider'></h4>";
    var tagbtn = "<button class='ui left floated tiny blue basic button' data-id='" + offset + "' data-de='" + degree + "' onclick='readMore(event)'>Read More</button>";
    var color_code = parseInt(Math.random() * CATEGORIES_COLOR_NUM);
    for(var i=0; i<Math.min(tags.length, MAX_CATEGORIES); i++){
        tagbtn += "<button class='ui right floated tiny " + CATEGORIES_COLOR_TABLE[color_code] + " basic button'>" + tags[i] + "</button>";
        color_code = (color_code + 1) % CATEGORIES_COLOR_NUM;
    }
    var show_degree = "<button class=\"ui right floated tiny red basic button\">" +
        degree + "</button>";
    var tailcontainer = "<div class='height-30px margin-10px-top'>" + tagbtn + show_degree + "</div>";
    return "<div class='ui blue segment'>" + titlestr + authorstr + aheaddivider + textstr + beforedivider + tailcontainer + "</div>";
}

function setProgress(page, total) {
    var p = document.getElementById('pg');
    p.innerText = "Page " + page + " / " + total;
}

function nextPage() {
    if(page >= parseInt((local_abs.length - 1) / articles_per_page)) return;
    page += 1;
    show_abs(page);
    setProgress(page + 1, parseInt((local_abs.length - 1) / articles_per_page + 1));
}

function lastPage() {
    if(page <= 0) return;
    page -= 1;
    show_abs(page);
    setProgress(page + 1, parseInt((local_abs.length - 1) / articles_per_page + 1));
}

function firstPage() {
    if(page <= 0) return;
    page = 0;
    show_abs(page);
    setProgress(page + 1, parseInt((local_abs.length - 1) / articles_per_page + 1));
}

function finalPage() {
    if(page >= parseInt((local_abs.length - 1) / articles_per_page)) return;
    page = parseInt((local_abs.length - 1) / articles_per_page);
    show_abs(page);
    setProgress(page + 1, parseInt((local_abs.length - 1) / articles_per_page + 1));
}

function readMore(e) {
    var btn_clk = e.target;
    var d = document.getElementById('show_result');
    var offset = btn_clk.getAttribute('data-id');
    var degree = btn_clk.getAttribute('data-de');

    var xmlhttp;
    xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if(xmlhttp.readyState==4 && xmlhttp.status==200) {
            var r = xmlhttp.responseText;

            // test
            var test = r.replace(/[^a-zA-Z]+/g, " ");
            test = test.split(" ");
            var len = test.length;
            console.log(len);
            var result_degree = 1 / (1 + Math.exp(-len / 2000)) - 0.5;
            console.log(result_degree * degree);

            var result = JSON.parse(r);
            Show_article(result.body);
            $('.ui.modal')
                .modal('show')
            ;
        }
    };
    xmlhttp.open("POST","/readMore",true);
    xmlhttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
    xmlhttp.send("offset=" + JSON.stringify(offset));
}

function Show_article(body) {
    /*
    var title, p, list;
    var titleSize;
    var stringbuf = "";
    for(var i=1; i<sections.length; i++){
        if(sections[i].depth > 4) titleSize = 5;
        else titleSize = sections[i].depth + 1;
        title = "<h"+titleSize+">" + sections[i].title + "</h"+titleSize+">";
        if(sections[i].list){
            list = "<p align='justify'>There is a list.</p>";
        }
        else list = "";
        if(sections[i].sentences){
            p = "<p align='justify'>";
            for(var j=0; j<sections[i].sentences.length; j++){
                p += sections[i].sentences[j].text;
            }
            p += "</p>";
        }
        stringbuf += title + list + p;
    }
    stringbuf = stringbuf.replace(/(&lt;)/g, "<");
    stringbuf = stringbuf.replace(/(&gt;)/g, ">");
    stringbuf = stringbuf.replace(/(TD)/g, "td");
    stringbuf = stringbuf.replace(/(TR)/g, "tr");
    stringbuf = stringbuf.replace(/(TH)/g, "th");
    stringbuf = stringbuf.replace(/(TABLE)/g, "table");
    */
    body = body.replace(/(&lt;)/g, "<");
    body = body.replace(/(&gt;)/g, ">");
    body = body.replace(/(TD)/g, "td");
    body = body.replace(/(TR)/g, "tr");
    body = body.replace(/(TH)/g, "th");
    body = body.replace(/(TABLE)/g, "table");
    body = body.replace(/<p align="justify">(\s*?)<\/p>/, "");
    var d = document.getElementById('article');
    d.innerHTML = body;
}

function mode_to_pre(){
    var p = document.getElementById('pre');
    var np = document.getElementById('npre');
    PREVIEW = true;
    p.innerHTML = "Pre<i class=\"ui checkmark green icon right floated\"></i>";
    np.innerHTML = "NonPre";
}

function mode_to_npre(){
    var p = document.getElementById('pre');
    var np = document.getElementById('npre');
    PREVIEW = false;
    p.innerHTML = "Pre";
    np.innerHTML = "NonPre<i class=\"ui checkmark green icon right floated\"></i>";
}
