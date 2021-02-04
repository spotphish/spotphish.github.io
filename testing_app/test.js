$('document').ready(function () {
  loadLatestVersion().then(version => {
    ROOT_DIR += version.name;
    templatesUrl = ROOT_DIR + "/Template Matching/main.json"
    defaultModels = [{
        weightage: 100,
        webgl: false,
        name: "TemplateMatching",
        dependencies: [
          ROOT_DIR + "/Template Matching/jsfeat.js",
          ROOT_DIR + "/Template Matching/orb-features.js"

        ],
        src: ROOT_DIR + "/Template Matching/Model.js",
        label: "Template Matching",
        selected: true,
      },
      {
        name: "LogoDetection",
        webgl: true,
        weightage: 0,
        dependencies: [
          "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@2.0.0/dist/tf.min.js",
        ],
        src: ROOT_DIR + "/LogoDetection/Model.js",
        label: "Logo Detection",
        selected: false
      }
    ]
  }).then(() => {
    loadScripts().then(() => {
      setTimeout(() => {
        primeWebgl().then(() => {
          fetchTemplates().then(() => {
            loadTestDataFrom(test_dataset_url).then(() => {
              showPage()
              if (RUN_TYPE === "AUTO") {
                runAutoTest().then(() => {
                  download(downloadData, "Result", "txt")
                })
              }
            })
          })
        })
      }, 100)
    })
  })


  document.getElementById("false").addEventListener("click", () => {
    displayResultList(resultList.filter(x => x.category === "false"))

  });
  document.getElementById("all").addEventListener("click", () => {
    displayResultList(resultList.filter(x => true))
  });
  document.getElementById("no").addEventListener("click", () => {
    displayResultList(resultList.filter(x => x.category === "no"))
  });
  document.getElementById("true").addEventListener("click", () => {
    displayResultList(resultList.filter(x => x.category === "true"))
  });
});
async function runAutoTest() {
  for (let item of defaultModels) {
    $("#urls").val(item.src);
    await runPositive()
  }
  return;
}

function download(data, filename, type) {
  var file = new Blob([JSON.stringify(data, null, 4)], {
    type: type
  });
  if (window.navigator.msSaveOrOpenBlob) // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  else { // Others
    var a = document.createElement("a"),
      url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}
async function loadLatestVersion() {
  let response = await fetch("https://api.github.com/repos/spotphish/models/releases/latest");
  let data = await response.json();
  return data;
}
async function loadScripts() {
  for (let item of defaultModels) {
    await injectScripts(item);
    $('#urls').append(`<option value="${item.src}"> ${item.label} </option>`);
  }
  return

}

function showPage() {
  document.getElementById("loader").style.display = "none";
  document.getElementById("myDiv").style.display = "block";
}
var Sites = {
  getTemplates: function () {
    return TEMPLATES;
  }
}

function disableButtons(enable) {
  document.getElementById("all").disabled = enable;
  document.getElementById("true").disabled = enable;
  document.getElementById("false").disabled = enable;
  document.getElementById("no").disabled = enable;
  document.getElementById("runPositiveTest").disabled = enable;

}
async function reportAverageTime(total_time, average_time, score) {

  document.getElementById("averageTime").innerHTML = "Total Prediction time: " + total_time + " sec," + " Average Prediction time: " + average_time + " sec";

}
async function showSummary(true_pred, false_pred, no_pred, total_pred) {

  document.getElementById("summary").innerHTML = "True:" + true_pred + ", False:" + false_pred + ", No Prediction:" + no_pred + ", Total:" + total_pred;
  disableButtons(false)

}
var resultList = [];

async function runPositive() {
  terminate = false;
  disableButtons(true)
  let url = $("#urls").val();
  let Model = (await import(url)).default;
  let x = new Model();

  resultList = [];
  var progress = document.getElementById("progress");
  progress.value = 0;

  let data = TEST_DATA;
  let total_time = 0,
    true_pred = 0,
    total_pred = 0,
    false_pred = 0,
    no_pred = 0;

  for (let index = 0; index < data.image.length; index++) {
    if (terminate) {
      break;
    }


    let startTime = performance.now()
    let result = await x.predict(data.image[index].url_src);
    result.time_taken = (performance.now() - startTime) / 1000


    total_time += result.time_taken;
    let category = "";
    if (result.site.includes(data.image[index].label)) {
      category = "true";
      true_pred++;
    } else if (result.site == "NaN") {
      result.site = "Not Predicted"
      result.confidence = 0
      category = "no";
      no_pred++;
    } else {
      category = "false";
      false_pred++;

    }
    result.confidence = result.confidence.toFixed(2)
    result.time_taken = result.time_taken.toFixed(2)

    resultList.unshift({
      category: category,
      label: data.image[index].label,
      result: result
    });
    total_pred++;
    progress.value = total_pred * 100 / data.image.length;
    displayResultList(resultList);

  }

  let average_time = total_time / total_pred;
  let score = (true_pred / total_pred) * 100;
  reportAverageTime(total_time.toFixed(2), average_time.toFixed(2), score.toFixed(2));
  showSummary(true_pred, false_pred, no_pred, total_pred);
  downloadData.push({
    "model": Model.name,
    "True Prediction": true_pred,
    "False Prediction": false_pred,
    "No Prediction": no_pred,
    "Total": total_pred,
    "Total Time(sec)": total_time.toFixed(2),
    "Average Time(sec)": average_time.toFixed(2),
    "Results": resultList.map(x => {
      return {
        ...x,
        "result": {
          ...x.result,
          "image": ""
        }
      }
    })

  });

}
var downloadData = [];
async function displayResult(label_, result, cat) {
  let tr = document.createElement("tr");
  if (cat === "true") {
    tr.style.backgroundColor = "lightgreen";
  } else if (cat === "false") {
    tr.style.backgroundColor = "lightpink";

  } else {
    // tr.style.backgroundColor = "lightblue";

  }
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

function displayResultList(list) {
  let t = document.getElementsByTagName("table");
  if (t === undefined || t.length === 0) {

  } else {
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
  for (let r of list) {
    displayResult(r.label, r.result, r.category);
  }

}
var TEST_DATA;
async function loadTestDataFrom(URL) {
  let response = await fetch(URL);
  let data = await response.json();
  TEST_DATA = data;
  return;
}

async function loadTemplates(URL) {
  let response = await fetch(URL);
  let data = await response.json();
  return data;
}
var TEMPLATES = [];
async function fetchTemplates() {
  let data = await loadTemplates(templatesUrl); //all websites templates
  let templates = [];
  for (let site of data.sites) {
    if (site.templates !== undefined)
      templates.push(site.templates)
  }
  templates = _.flatten(templates);
  for (let temp of templates) {
    try {
      let x = await createPatterns(temp.image)
      temp = {
        ...temp,
        ...x,
        site: temp.name
      }
      TEMPLATES.push(temp)
    } catch (e) {
      console.log(e)
    }
  }
  return;
}
async function injectScripts(item) {
  if ($("#" + item.name).length !== 0) {
    return;
  }
  let di = document.createElement('div');
  di.id = item.name;
  document.body.appendChild(di);
  for (let x of item.dependencies) {
    let ga1 = document.createElement('script');
    ga1.type = 'text/javascript';
    ga1.src = x;
    $("#" + item.name).append(ga1);
  }

  return;
}
var terminate = false;

function doTerminate() {
  terminate = true;
}
async function primeWebgl() {
  let item = defaultModels[1];
  let Model = (await import(item.src)).default;
  let x = new Model();
  await x.predict("./feeds/main/images/pixel.png");
  return;
}