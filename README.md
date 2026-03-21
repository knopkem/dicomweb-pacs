# dicomweb-pacs

An easy to use PACS with DICOMWEB and DIMSE service support.

## Description

- A Node.js PACS service with DICOMWEB (QIDO-RS and WADO-RS) and DIMSE support.
- Comes preinstalled with the popular [OHIF DICOM Web Viewer](https://github.com/OHIF/Viewers) (version 3.10.1).
- Supports OHIF MPR (vtk.js) for volumetric datasets.
- Uses a TypeScript codebase and a modular structure similar to `dicomweb-proxy`.

No need for a server, try the [standalone desktop edition](https://github.com/knopkem/pacsnode).

## Prerequisite

- A modern Node.js runtime.

## Setup Instructions - npm

- Install in an empty directory:
  ```bash
  npm init -y
  npm install dicomweb-pacs
  ```
- Update the config file in `./node_modules/dicomweb-pacs/config/default.json`.
- Start the PACS:
  ```bash
  npx dicomweb-pacs
  ```

## Setup Instructions - source

- Clone the repository and install dependencies:
  ```bash
  npm install
  ```
- Update `./config/default.json`.
- Start the development server:
  ```bash
  npm start
  ```
- Build the production bundle:
  ```bash
  npm run build
  node build/app.js
  ```
- Import DICOM images with any C-STORE-SCU to the internal store-SCP:
  ```text
  AET: DICOMWEB_PACS   port: 8888
  ```
- Or put DICOM files into `./import` and run:
  ```bash
  npm run import
  ```
  This imports the files directly into the PACS storage path.
- Open the viewer at `http://localhost:5001`.

## What to modify

- Change the PACS AET or DIMSE port in `config/default.json`:
  ```json
  {
    "source": {
      "aet": "OUR_AET",
      "ip": "OUR_IP",
      "port": "OUR_PORT"
    }
  }
  ```
- Add peers:
  ```json
  {
    "peers": [
      {
        "aet": "PEER_AET",
        "ip": "PEER_IP",
        "port": "PEER_PORT"
      }
    ]
  }
  ```
- Update the HTTP listener:
  ```json
  {
    "httpPort": 5001,
    "httpIp": "0.0.0.0"
  }
  ```

## License

MIT
