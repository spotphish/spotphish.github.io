$('document').ready(function () {
  showPage()
  $("#loader p").html("Fetching latest version");
  new Promise(async (res, rej) => {
    $("#loader p").html("Loading models");
    for (let x of defaultModels) {
      ROOT_DIR = undefined
      x.name = (x.label).replace(/\s+/g, "_");
      let srcFile = x.root;
      srcFile = srcFile.replace("github.com", "cdn.jsdelivr.net/gh")
      srcFile = srcFile.replace("tree/", "")
      let splitted_domain = srcFile.split("/")
      splitted_domain.splice(6, 1)
      let latest_version = await loadLatestVersion(splitted_domain[4], splitted_domain[5])
      if (latest_version.name !== undefined) {
        splitted_domain[5] = splitted_domain[5] + "@" + latest_version.name;
      }
      ROOT_DIR = splitted_domain.slice(0, 6).join("/")
      srcFile = splitted_domain.join("/");
      srcFile += "/Model.js"
      if (!srcFile.includes("https://cdn.jsdelivr.net/")) {
        continue;
      }

      let remoteFile;
      try {
        remoteFile = (await import(srcFile));
      } catch (e) {
        console.log(e);
        continue
      }
      let Model = remoteFile.default;
      if (Model !== undefined) {
        if (Model.prototype.predict != null && (typeof Model.prototype.predict) === "function") {
          if (Model.dependencies !== undefined && Array.isArray(Model.dependencies)) {
            x.dependencies = Model.dependencies;
          } else {
            x.dependencies = [];
          }
        } else {
          continue
        }
      } else {
        continue
      }
      x.src = srcFile;
      x.root = ROOT_DIR
      ROOT_DIR = undefined
    }
    res()
  }).then(() => {
    console.log(defaultModels);
    loadScripts().then(() => {
      setTimeout(() => {
        $("#loader p").html("Fetching templates");

        fetchTemplates().then(() => {
          $("#loader p").html("Loading canned test images dataset");

          loadTestDataFrom(test_dataset_url).then(() => {
            showPage()
            if (RUN_TYPE === "AUTO") {
              runAutoTest().then(() => {
                download(downloadData, "Result", "txt")
              })
            }
          })
        })
      }, 2000)
    })
  })

  $("#image-picker").change(function (event) {
    readURL(this);
  });
  $('#urls').on('click', function () {
    $("#customModelUrl").val("");
  });
  $('#customModelUrl').on('change', async function () {
    let x = {
      root: $(this).val(),
      label: "x",
    }
    ROOT_DIR = undefined
    x.name = (x.label).replace(/\s+/g, "_");

    let srcFile = x.root;
    srcFile = srcFile.replace("github.com", "cdn.jsdelivr.net/gh")
    srcFile = srcFile.replace("tree/", "")
    let splitted_domain = srcFile.split("/")
    splitted_domain.splice(6, 1)
    let latest_version = await loadLatestVersion(splitted_domain[4], splitted_domain[5])
    if (latest_version.name !== undefined) {
      splitted_domain[5] = splitted_domain[5] + "@" + latest_version.name;
    }
    ROOT_DIR = splitted_domain.slice(0, 6).join("/")
    srcFile = splitted_domain.join("/");
    srcFile += "/Model.js"
    console.log(srcFile);
    if (!srcFile.includes("https://cdn.jsdelivr.net/")) {
      return;
    }

    let remoteFile;
    try {
      remoteFile = (await import(srcFile));
    } catch (e) {
      console.log(e);
      return;
    }
    let Model = remoteFile.default;
    if (Model !== undefined) {
      x.label = Model.name;
      if (Model.prototype.predict != null && (typeof Model.prototype.predict) === "function") {
        if (Model.dependencies !== undefined && Array.isArray(Model.dependencies)) {
          x.dependencies = Model.dependencies;
        } else {
          x.dependencies = [];
        }
      } else {
        return
      }
    } else {
      return
    }
    x.src = srcFile;
    x.root = ROOT_DIR
    x.name = (x.label).replace(/\s+/g, "_");
    ROOT_DIR = undefined
    defaultModels.push(x);
    await injectScripts(x);
    $('#urls').append(`<option value="${x.name}"> ${x.label} </option>`);
    $(this).val("Your model was successfully added to the above list");
    console.log(defaultModels);
  });
  document.querySelector('#stop').addEventListener('click', doTerminate);
  document.querySelector('#runCustomTest').addEventListener('click', runCustom);
  document.querySelector('#runPositiveTest').addEventListener('click', runPositive);

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
var CUSTOM_TEST_IMG;

function readURL(input) {
  if (input.files && input.files[0]) {
    let reader = new FileReader();

    reader.onload = function (e) {
      CUSTOM_TEST_IMG = e.target.result;
      dataset = "custom";
      runPositive();
    }
    reader.readAsDataURL(input.files[0]);
  }
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
    a.id = "resultfile"
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 30000);
  }
}

async function loadLatestVersion(USER, PROJECT) {
  let response = await fetch("https://api.github.com/repos/" + USER + "/" + PROJECT + "/releases/latest");
  let data = await response.json();
  return data;
}
async function loadScripts() {
  for (let item of defaultModels) {
    await injectScripts(item);
    $('#urls').append(`<option value="${item.name}"> ${item.label} </option>`);
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
  document.getElementById("runCustomTest").disabled = enable;

}
async function reportAverageTime(total_time, average_time, score) {

  document.getElementById("averageTime").innerHTML = "Total Prediction time: " + total_time + " sec," + " Average Prediction time: " + average_time + " sec";

}
async function showSummary(true_pred, false_pred, no_pred, total_pred) {

  document.getElementById("summary").innerHTML = "<p id='finalresult'> True:" + true_pred + ", False:" + false_pred + ", No Prediction:" + no_pred + ", Total:" + total_pred + "</p>";
  disableButtons(false)

}



var resultList = [];
var dataset = "canned";
async function runCustom() {
  $("#image-picker").click()
}
async function runPositive() {
  terminate = false;
  disableButtons(true)
  let selected_model_id = $("#urls").val();
  let selected_model;
  for (let x of defaultModels) {
    if (x.name === selected_model_id) {
      selected_model = x;
      break;
    }
  }
  let Model = (await import(selected_model.src)).default;
  ROOT_DIR = selected_model.root;

  let x = new Model();
  resultList = [];
  var progress = document.getElementById("progress");

  progress.value = 0;
  let data = TEST_DATA;
  if (dataset === "custom") {
    let str = $("#image-picker").val().split(/(\\|\/)/g).pop();

    data = {
      "image": [{
        "label": str,
        "url_src": CUSTOM_TEST_IMG
      }]
    }
    dataset = "canned"
  }
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
    if (result.site.toLowerCase().includes(data.image[index].label.toLowerCase()) || data.image[index].label.toLowerCase().includes(result.site.toLowerCase())) {
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
  await x.predict("./pixel.png");
  return;
}