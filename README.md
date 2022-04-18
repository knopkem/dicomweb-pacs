# dicomweb-pacs

An easy to use PACS with DICOMWEB and DIMSE service support

## Description
* A nodejs tool to easily spawn a PACS server including DICOM viewer connected via DICOMWEB (QIDO-RS and WADO-RS).
* Comes with preinstalled OHIF DICOM Web Viewer (version 4.12.25).
* Supports OHIF MPR (vtk.js) feature for viewing volumetric datasets
* multithreaded
* sqlite backend

## Prerequisite

* nodejs 12 or newer

## Setup Instructions - npm

* install in empty directory:  
  ```npm init -y```  
  ```npm install dicomweb-pacs```

* update config file located in:  
  ```./node_modules/dicomweb-pacs/config```

* start pacs:  
  ```npx dicomweb-pacs```

## Setup Instructions - source

* clone repository and install dependencies  
  ```npm install```

* update config file located in:  
  ```./config```

* run:  
  ```npm start```

* import DICOM images: use any c-store-scu to push to internal store-scp  
  ```(AET: DICOMWEB_PACS   port: 8888)```

* (or use internal store-scu): put DICOM into import directory and run  
  ```npm run import``` (server needs to be running)

* open webbrowser and start viewing  
  ```http://localhost:5001```

## What to modify

* (optional) change our port or AET 

  ```
    config.source = {
      aet: "OUR_AET",
      ip: "OUR_IP",
      port: "OUR_PORT"
    };
    ```

* add peers to your PACS

  ```
    config.peers = [
    {
      aet: "PEER_AET",
      ip: "PEER_IP",
      port: "PEER_PORT"
    }];
    ```

* update webserver port:  
  ```config.webserverPort = 5001;```

## License
MIT
