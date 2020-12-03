
async function loadTestDataFrom(URL) {
    let response = await fetch(URL);
    let data = await response.json();
    TEST_DATA= data;
}
async function loadTemplates(URL) {
    let response = await fetch(URL);
    let data = await response.json();
    return data;
}

async function displayResult(label_, result) {
    let tr = document.createElement("tr");
    let label = document.createElement("td");
    let prediction = document.createElement("td");
    let confidence = document.createElement("td");
    let time_taken = document.createElement("td");
    let image = document.createElement("td");

    tr.appendChild(label);
    tr.appendChild(prediction);
    tr.appendChild(confidence);
    tr.appendChild(time_taken);
    tr.appendChild(image);

    label.innerHTML = label_;
    prediction.innerHTML = result.site;
    confidence.innerHTML = result.confidence + "%";
    time_taken.innerHTML = result.time_taken + " sec";

    var img = document.createElement("img");
    img.src = result.image;
    img.style.width = "500px";
    image.appendChild(img);

    document.getElementsByTagName("table")[0].appendChild(tr);
}

async function configureMachineLearningModel(log_url, model_url, labels) {
    let report = await new SystemLog(log_url);
    const tensorflow_tf = await new TensorflowTF(model_url, labels);
    return {"report": report, "tensorflow_tf": tensorflow_tf};
}

async function reportAverageTime(total_time,average_time, score) {
    let time = document.createElement("p");
    time.style.cssText = "font-size: 20px; font-weight: bold; color: darkgreen";
    time.innerHTML ="Total Prediction time: " + total_time + " sec," + " Average Prediction time: " + average_time + " sec" + ", Score: " + score;
    document.body.appendChild(time);
}

async function showSummary(true_pred,false_pred,no_pred, total_pred) {
    let Summary = document.createElement("p");
    Summary.style.cssText = "font-size: 20px; font-weight: bold; color: red";
    Summary.innerHTML = "True:" +true_pred + ", False:" +false_pred +", No Prediction:" + no_pred+", Total:"+total_pred;
    document.body.appendChild(Summary);
}
var TEMPLATES=[];
var TEST_DATA;
async function getTemplates(){
    // let data=await loadTemplates("https://spotphish.github.io/feeds/main/main.json");//other websites templates
    let data=await loadTemplates("https://vijay-coriolis.github.io/main.json");//bank websites templates

    let templates=[];
    for(let site of data.sites){
        if(site.templates!==undefined)
        templates.push(site.templates)
    }
    templates=_.flatten(templates);
    for(let temp of templates){
        createPatterns(temp.image).then(x=>{

            temp={...temp,...x}
            TEMPLATES.push(temp)
        }).catch(x=>{
       });
    }
}
async function templateMatching(){
    disableButtons(true);
    resultList=[];
    var progress=document.getElementById("progress");
    progress.value=0;

    let data=TEST_DATA;
    let total_time = 0, true_pred = 0, total_pred = 0,false_pred=0,no_pred=0;

    for (let index = 0; index <data.image.length; index++) {
        let screenshot = data.image[index].url_src;
        let features=await findOrbFeatures(screenshot);
        let match=await matchTemplates(features,screenshot);
           let result = {
            site:match.template.name,
            confidence:(match.goodMatches/match.ncorners)*100,
            time_taken:match.time_taken,
            image:match.image
        }
           total_time += result.time_taken;
           let category="";
           if ( result.site.includes(data.image[index].label)) {
               category="true";
               true_pred++;
           }else if(result.site=="NaN"){
               result.site="Not Predicted"
               category="no";
               no_pred++;
           }else{
               category="false";
               false_pred++;
           }
           resultList.push({category:category,label:data.image[index].label,result:result});
           total_pred++;
           progress.value=total_pred*100/data.image.length;
    }
    let average_time = total_time/data.image.length;
    let score = (true_pred/total_pred) * 100;


    displayResultList(resultList);
    reportAverageTime(total_time.toFixed(2),average_time.toFixed(2), score.toFixed(2));
    showSummary(true_pred,false_pred,no_pred,total_pred);

}
async function matchTemplates(scrFeatures,screenshot) {
    const scrCorners = scrFeatures.corners;
    const scrDescriptors = scrFeatures.descriptors;
    let t0 = performance.now();
    let max=0;
    let result=null;
    for (let i = 0; i < TEMPLATES.length; i++) {
        let template = TEMPLATES[i];
        const res = matchOrbFeatures(scrCorners, scrDescriptors, template.patternCorners,
            template.patternDescriptors, template.name);
        if (res) {
            let t1 = performance.now();
            res.template = template;
            res.time_taken=(t1-t0)/1000;
            let corr_image= await makeCorrespondenceImage(res,screenshot,scrFeatures);
            res.image=corr_image;
            let confidence=res.goodMatches/res.ncorners;

            if(confidence>max){
                max=confidence;
                result=res;
            }
        }
    }
    if(result==null){
        result={goodMatches:0,ncorners:0, template:{name:"NaN"},
        time_taken:(performance.now()-t0)/1000,
        image:screenshot}
    }
    return Promise.resolve(result);
}
function run(){

   let url= document.getElementById("urls").value;
   switch(url){
       case "tfLogoDetection": tfLogoDetection();break;
       case "templateMatching": templateMatching();break;
   }
}
async function makeCorrespondenceImage(match, screenshot, features) {
    if (!match) {
        return Promise.resolve(null);
    }
    return findCorrespondence(screenshot, features.corners , match.template, match.matches, match.matchCount,
        match.mask);
}
var resultList=[];
function disableButtons(enable){
    document.getElementById("all").disabled=enable;
    document.getElementById("true").disabled=enable;
    document.getElementById("false").disabled=enable;
    document.getElementById("no").disabled=enable;
    document.getElementById("run").disabled=enable;


}
async function tfLogoDetection() {

    disableButtons(true);
    resultList=[];
    var progress=document.getElementById("progress");
    let ml_system = await configureMachineLearningModel(system_log_server_url,algorithm_tensorflow_graph_model_url, algorithm_tensorflow_labels);
    let data=TEST_DATA;
    let total_time = 0, true_pred = 0, total_pred = 0,false_pred=0,no_pred=0;
    progress.value=0;
    for (let index = 0; index < data.image.length; index++) {
        let result = await ml_system.tensorflow_tf.predict(data.image[index].url_src);
        total_time += result.time_taken;
        let category="";
        if ( result.site.includes(data.image[index].label)) {
            category="true";
            true_pred++;
        }else if(result.site=="NaN"){
            result.site="Not Predicted"
            category="no";
            no_pred++;
        }else{
            category="false";
            false_pred++;
        }
        resultList.push({category:category,label:data.image[index].label,result:result});
        total_pred++;
        progress.value=total_pred*100/data.image.length;
    }

    let average_time = total_time/data.image.length;
    let score = (true_pred/total_pred) * 100;

    displayResultList(resultList);
    reportAverageTime(total_time.toFixed(2),average_time.toFixed(2), score.toFixed(2));

    showSummary(true_pred,false_pred,no_pred,total_pred);
}
function displayResultList(list){
    disableButtons(false)
    let t=document.getElementsByTagName("table");
    if(t===undefined || t.length===0){

    }else{
        t[0].remove();
    }
    let table = document.createElement("table");
    let tr = document.createElement("tr");
    let label = document.createElement("th");
    let prediction = document.createElement("th");
    let confidence = document.createElement("th");
    let time_taken = document.createElement("th");
    let image = document.createElement("th");

    tr.appendChild(label);
    tr.appendChild(prediction);
    tr.appendChild(confidence);
    tr.appendChild(time_taken);
    tr.appendChild(image);
    table.appendChild(tr);
    label.innerHTML = "label";
    prediction.innerHTML = "Prediction";
    confidence.innerHTML = "Confidence";
    time_taken.innerHTML = "Time taken";
    image.innerHTML = "Image";

    document.body.appendChild(table);
    for(let r of list){

        displayResult(r.label,r.result);

    }

}
$('document').ready(function(){
    getTemplates()
    loadTestDataFrom(test_dataset_url);//all websites testing images
    // loadTestDataFrom(test_dataset_banks_jpg_url);//bank jpg website testing images
    // loadTestDataFrom(test_dataset_banks_png_url);//bank png website testing images
    // loadTestDataFrom(test_dataset_others_url);//other website testing images



    document.getElementById("false").addEventListener("click", ()=>{
        displayResultList(resultList.filter(x=>x.category==="false"))

    });
    document.getElementById("all").addEventListener("click", ()=>{
        displayResultList(resultList.filter(x=>true))

    });
    document.getElementById("no").addEventListener("click", ()=>{
        displayResultList(resultList.filter(x=>x.category==="no"))

    });
    document.getElementById("true").addEventListener("click", ()=>{
        displayResultList(resultList.filter(x=>x.category==="true"))


    });
});
