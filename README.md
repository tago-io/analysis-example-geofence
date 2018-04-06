## What this does
Analysis to be trigerred by an action. It converts the payload variable "pdu" of the DecentLab device, extracting its data and inserting it to the device bucket.

## How to use on Tago
Do your own modifications if you want.<br>
Upload to Tago analysis, in the admin website.<br>
Add the environment variable `acc_token` with the account token of your choice.<br>
Create action to run the analysis with trigger from `pdu` variable of the device. Condition should be `Any`.

## How to run the analysis from your machine  
Make sure you have npm and node installed in your machine.<br>
Add the environment variable `acc_token` with the account token of your choice, to the analysis configuration, in the admin website.<br>
Create action to run the analysis with trigger from "pdu" variable of the device. Condition should be "Any".
Open the index.js, change `MY-ANALYSIS-TOKEN-HERE` line for your analysis token.<br>
Opens the terminal and run:

`npm install`<br>
`node .`

