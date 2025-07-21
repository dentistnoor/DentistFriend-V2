// This script is intended to be run on scripts.google.com as a Google Apps Script Web App endpoint.

function syncPatientToGoogleSheet(patientData, webAppUrl) {
  fetch(webAppUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(patientData),
  })
    .then((response) => response.json())
    .then((data) => {
      // Optionally handle response
      // console.log('Google Sheet sync response:', data);
    })
    .catch((error) => {
      // Optionally handle error
      // console.error('Google Sheet sync error:', error);
    });
}

// TODO: Integrate this function into your add patient flow.
// TODO: Implement authentication and error handling as needed for production.
