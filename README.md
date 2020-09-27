# dicomweb-pacs

An easy to use PACS with DICOMWEB and DIMSE service support

## Description
* A nodejs tool to easily spawn a PACS server including DICOM viewer connected via DICOMWEB. Comes with preinstalled OHIF DICOM Web Viewer.

## Prerequisite

* nodejs 12 or newer

## Setup Instructions - npm

* install in empty directory
```npm install dicomweb-pacs```

* update config file located in:
```./node_modules/dicomweb-pacs/config```

* run:
```npx dicomweb-pacs```

## Setup Instructions - source

* clone repository and install dependencies 
```npm install```

* update config file located in:
```./config```

* run:
```npm start```

## What to modify
* (optional) change source port or AET 

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

* update port
```config.webserverPort = 5000;```

* open webbrowser and start viewing
e.g. ```http://localhost:5000```

## License
MIT