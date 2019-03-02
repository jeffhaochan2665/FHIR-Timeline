// Create a FHIR client (server URL, patient id in `demo`)
var smart = FHIR.client(demo)
$.patient = null;
$.conditions = null;
$.medDispenses = null;
$.observations = null;

function getDateString(date) {
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}

function getAge(birthDate) {
    currentDate = new Date();
    if (currentDate.getMonth() > birthDate.getMonth() || (currentDate.getMonth == birthDate.getMonth() && currentDate.getDate() >= birthDate.getDate())) {
        return currentDate.getFullYear() - birthDate.getFullYear();
    } else {
        return currentDate.getFullYear() - birthDate.getFullYear() - 1;
    }
}

function getAddress(address_obj) {
    address = "";
    for (i = 0; i < address_obj.line.length; i++) {
        address += address_obj.line[i] + " ";
    }
    return address.trim() + ", " + address_obj.city + ", " + address_obj.state + ", " + address_obj.country;
}

function getTimelineNode(dateString, events) {
    var node = $("<li class='work'></li>");

    var input = $("<input class='radio' type='radio' name='works'></input>").attr("id", dateString);

    var eventLabel = $("<label>Ambulatory Encounter</label>").attr("for", dateString);
    var otherLabels = $("<span class='date'>"+dateString+"</span><span class='circle'></span>");
    var labels = $("<div class='relative'></div>").append(eventLabel, otherLabels);

    var table = $("<table style='width:100%'></table>");
    var header = $("<tr><th>Condition</th><th>Observation</th><th>Medication</th></tr>");
    var row = $("<tr></tr>");
    var condition = ""
    var observation = ""
    var medication = ""
    for (i = 0; i < events.length; i++) {
        event = events[i];
        if (event.type == "condition") {
            condition += "<p>" + event.code + "</p>";
        }
        if (event.type == "observation") {
            observation += "<p>" + event.code + " : " + event.value + " " + event.unit + "</p>";
        }
        if (event.type == "medDispense") {
            medication += "<p>" + event.name + "</br>" + "Quantity : " + event.quantity.value + " " + event.quantity.unit + "</br>" + "Supply : " + event.supply.value + " " + event.supply.unit + "</p>";
        }
    }
    row.append($("<td>"+condition+"</td>"));
    row.append($("<td>"+observation+"</td>"));
    row.append($("<td>"+medication+"</td>"));
    table.append(header);
    table.append(row);

    var content = $("<div class='content'></div>").append($("<div class='row'></div>").append(table));
    node.append(input, labels, content);
    return node;
}

function render_list() {
    if (self.patient && self.conditions && self.medDispenses && self.observations) {
        console.log("--- data retrieved ---");
        clearInterval($.timer_handler);

        events = self.conditions.concat(self.medDispenses, self.observations);
        events.sort(function (a, b) {
            return a.date - b.date;
        });
        eventsByDate = {};
        for (i = 0; i < events.length; i++) {
            event = events[i];
            if (eventsByDate.hasOwnProperty(getDateString(event.date))) {
                eventsByDate[getDateString(event.date)].push(event);
            } else {
                eventsByDate[getDateString(event.date)] = [event];
            }
        }
        for (var date in eventsByDate) {
            $("#timeline").append(getTimelineNode(date, eventsByDate[date]));
        }
        $("#patient_name").text(patient.name);
        $("#patient_id").text(patient.id);
        $("#patient_gender").text(patient.gender);
        $("#patient_age").text(getAge(patient.birthDate));
        $("#patient_dob").text(getDateString(patient.birthDate));
        $("#patient_phone").text(patient.phone);
        $("#patient_email").text(patient.email);
        $("#patient_address").text(getAddress(patient.address));
        /*
        $("#patient_name").text($.patient.name);
        $("#patient_gender").text($.patient.gender);
        $("#patient_age").text(new Date().getFullYear() - $.patient.birthDate.getFullYear());        
        $("#patient_id").text($.patient.id);
        $("#patient_dob").text($.patient.birthDate.toLocaleDateString("en-US", {day:'numeric', month: 'short', year: 'numeric'});
        $("#patient_address").text($.patient.address.line.join() + ", " + patient.address.city + ", " + patient.address.state + ", " + patient.address.country + " " + patient.address.postalCode);
        */
    } else {
        console.log("--- waiting for data ---")
    }
}

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
    for (i = 0; i < rawPatient.telecom.length; i++) {
        communication = rawPatient.telecom[i];
        patient[communication.system] = communication.value;
    }
    $.patient = patient;
});

smart.patient.api.fetchAllWithReferences({ type: "Condition" }).then(function (results, refs) {
    conditions = [];
    for (i = 0; i < results.length; i++) {
        rawCondition = results[i];
        condition = {
            type: "condition",
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
    $.conditions = conditions;
});

smart.patient.api.fetchAllWithReferences({ type: "MedicationDispense" }).then(function (results, refs) {
    medDispenses = [];
    for (i = 0; i < results.length; i++) {
        rawMedDispense = results[i];
        medDispense = {
            name: rawMedDispense.medicationCodeableConcept.text,
            type: "medDispense"
        };
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
    $.medDispenses = medDispenses;
});

smart.patient.api.fetchAllWithReferences({ type: "Observation" }).then(function (results, refs) {
    observations = [];
    for (i = 0; i < results.length; i++) {
        rawObservation = results[i];
        dateEncoding = rawObservation.effectiveDateTime.split("-");
        if (rawObservation.code.text == "Blood pressure systolic and diastolic") {
            components = rawObservation.component;
            for (j = 0; j < components.length; j++) {
                component = components[j];
                observation = {
                    type: "observation"
                };
                observation.code = component.code.text.replace("_", " ").toLowerCase();
                observation.date = new Date(dateEncoding[0], dateEncoding[1] - 1, dateEncoding[2]);
                if (component.valueQuantity) {
                    observation.value = component.valueQuantity.value;
                    observation.unit = component.valueQuantity.unit;
                }
                observations.push(observation);
            }
        } else {
            observation = {
                type: "observation"
            };
            observation.code = rawObservation.code.text.replace("_", " ").toLowerCase();
            observation.date = new Date(dateEncoding[0], dateEncoding[1] - 1, dateEncoding[2]);
            if (rawObservation.valueQuantity) {
                observation.value = rawObservation.valueQuantity.value;
                observation.unit = rawObservation.valueQuantity.unit;
            }
            observations.push(observation);
        }
    }
    observations.sort(function (a, b) {
        return a.date - b.date;
    })
    $.observations = observations;
});