class SystemLog {
    
    constructor(TRACKURL) {
        this.TRACKURL = TRACKURL;
    }

    trackResult(data, screenshot, hostname){
        fetch(this.TRACKURL , {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({spotphish: {site: data.site, score: data.confidence, time: data.time_taken, base64: screenshot, hostname: hostname }})
        })
        .then(response => {
        if (response.ok) {
          return Promise.resolve(1);
        }
        else {
          return Promise.reject(new Error('Failed to load')); 
        }
        })
        .then(data => {
        // success
        })
        .catch(function(error) {
          console.log(`Error: ${error.message}`);
        });
    }
    
    getLocation(purl) {
      let l = document.createElement("a");
      l.href = purl;
      return l.hostname;
    }
}