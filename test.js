async function loadTestDataFrom(URL) {
    let response = await fetch(URL);
    let data = await response.json();
    console.log(data);
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

async function reportAverageTime(average_time, score) {
    let time = document.createElement("p");
    time.style.cssText = "font-size: 30px; font-weight: bold; color: darkgreen";
    time.innerHTML = "Average Prediction time: " + average_time + " sec" + ", Score: " + score;
    document.body.appendChild(time);
}

async function run() {
    let ml_system = await configureMachineLearningModel(system_log_server_url, algorithm_tensorflow_graph_model_url, algorithm_tensorflow_labels);
    console.log("ML system configured.",ml_system);
    let data = await loadTestDataFrom(test_dataset_url);
    console.log("Test data loaded.");
    let total_time = 0, true_pred = 0, total_pred = 0;
    // console.log(data.image[0].url_src);
    for (let index = 0; index < data.image.length; index++) {
        let result = await ml_system.tensorflow_tf.predict(data.image[index].url_src);
        console.log(result);
        displayResult(data.image[index].label,result);
        total_time += result.time_taken;
        if (data.image[index].label == result.site) {
            true_pred++;
        }
        total_pred++;
    }
    let average_time = total_time/data.image.length;
    let score = (true_pred/total_pred) * 100;
    reportAverageTime(average_time, score);
    // let result = await ml_system.tensorflow_tf.debugPredict(data.image[14].url_src);
    // console.log(result);
    // displayResult(data.image[14].label,result);   
}

run();
// return tensorflow_tf.debugPredict(res, screenshot, tab.url);
// 
