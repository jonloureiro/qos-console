[![Netlify Status](https://api.netlify.com/api/v1/badges/60966b5d-f9d0-407f-a308-66eb52fc0506/deploy-status)](https://app.netlify.com/sites/qos-console/deploys)

# QoS Console

## How to use

    #### Install Netlify CLI

    ```bash
    npm install netlify-cli -g
    ```

    #### Create .env file

    Example in .env-sample file.
    DynamoDB credentials required.
    Public and private keys are generated by generateKey.js script.

    ```bash
    node generateKey.js
    ```

    #### How run local server

    ```bash
    npm run dev
    ```
