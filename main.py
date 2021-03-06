from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as ec
import time, sys, os

print("Running the script...")
pwd = os.getcwd()
url = os.getenv("URL")
if not url:
    sys.exit("URL not found")
else:
    print(url)

options = Options()
options.headless = True
options.add_experimental_option("prefs", {
  "download.default_directory": pwd,
  "download.prompt_for_download": False,
  "download.directory_upgrade": True,
  "safebrowsing.enabled": True
})

try:
    driver = webdriver.Chrome(options=options)
    driver.get(url)
    element = WebDriverWait(driver, 10000,poll_frequency=5).until(
        ec.presence_of_element_located((By.ID, "resultfile"))
    )
    time.sleep(5)

except KeyboardInterrupt:
    sys.exit(0)
except Exception as e:
    print(str(e))
    sys.exit(1)
else:
    print("Job succeeded: Check the results in artifacts")
    driver.close()
