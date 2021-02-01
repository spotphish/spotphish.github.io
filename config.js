//For Template matching
//positive dataset contains test images whose templates are available with us. Therefore,these images must be predicted
var test_dataset_positive_url = "./load-dataset-positive.json";
//Negative dataset contains test images whose templates are not available with us. Therefore,these images must not be predicted
var test_dataset_negative_url = "./load-dataset-negative.json";


//Only bank website images (png)
var test_dataset_banks_png_url = "./load-dataset-banks_png.json";
//Non banking website images
var test_dataset_others_url = "./load-dataset-others.json";
//Banking + Non banking websites
var test_dataset_url = "./load-dataset.json";
//Only bank website images. JPG images dataset does not give satisfactory results
var test_dataset_banks_jpg_url = "./load-dataset-banks_jpg.json";
var ROOT_DIR = "https://cdn.jsdelivr.net/gh/spotphish/spotphish@",
  templatesUrl, defaultModels;


var RUN_TYPE = "MANUAL"