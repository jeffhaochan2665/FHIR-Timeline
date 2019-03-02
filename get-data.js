// Create a FHIR client (server URL, patient id in `demo`)
var smart = FHIR.client(demo)

smart.patient.read().then(function (rawPatient) {
    patient = {
        id: rawPatient.id,
        gender: rawPatient.gender,
        address: rawPatient.address[0]
    }
    name = ""
    for (i = 0; i < rawPatient.name[0].given.length; i++) {
        name += rawPatient.name[0].given[i] + " ";
    }
    for (i = 0; i < rawPatient.name[0].family.length; i++) {
        name += rawPatient.name[0].family[i] + " ";
    }
    patient.name = name;
    dateEncoding = rawPatient.birthDate.split("-");
    patient.birthDate = new Date(dateEncoding[0], dateEncoding[1] - 1, dateEncoding[2]);
    console.log(patient);
});

smart.patient.api.fetchAllWithReferences({ type: "Condition" }).then(function (results, refs) {
    conditions = [];
    for (i = 0; i < results.length; i++) {
        rawCondition = results[i];
        condition = {
            code: rawCondition.code.text.toLowerCase()
        }
        dateEncoding = rawCondition.onsetDateTime.split("-");
        condition.date = new Date(dateEncoding[0], dateEncoding[1] - 1, dateEncoding[2]);
        conditions.push(condition);
    }
    conditions.sort(function (a, b) {
        return a.date - b.date;
    });
    outside_conditions = conditions
    console.log(conditions);
});

smart.patient.api.fetchAllWithReferences({ type: "MedicationDispense" }).then(function (results, refs) {
    medDispenses = [];
    for (i = 0; i < results.length; i++) {
        rawMedDispense = results[i];
        medDispense = {};
        dateEncoding = rawMedDispense.whenHandedOver.split("-");
        medDispense.date = new Date(dateEncoding[0], dateEncoding[1] - 1, dateEncoding[2]);
        medDispense.quantity = {
            value: rawMedDispense.quantity.value,
            unit: rawMedDispense.quantity.unit
        };
        medDispense.supply = {
            value: rawMedDispense.daysSupply.value,
            unit: "days"
        };
        medDispenses.push(medDispense);
    }
    medDispenses.sort(function (a, b) {
        return a.date - b.date;
    })
    console.log(medDispenses);
});

smart.patient.api.fetchAllWithReferences({ type: "Observation" }).then(function (results, refs) {
    observations = [];
    for (i = 0; i < results.length; i++) {
        rawObservation = results[i];
        observation = {};
        observation.code = rawObservation.code.text.replace("_", " ").toLowerCase();
        dateEncoding = rawObservation.effectiveDateTime.split("-");
        observation.date = new Date(dateEncoding[0], dateEncoding[1] - 1, dateEncoding[2]);
        if (rawObservation.valueQuantity) {
            observation.value = rawObservation.valueQuantity.value;
            observation.unit = rawObservation.valueQuantity.unit;
        }
        observations.push(observation);
    }
    observations.sort(function (a, b) {
        return a.date - b.date;
    })
    console.log(observations);
    testBoolean = true;
});
console.log(testBoolean);
