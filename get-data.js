// Create a FHIR client (server URL, patient id in `demo`)
var smart = FHIR.client(demo)
$.patient = null;
$.conditions = null;
$.medDispenses = null;
$.observations = null;

function getDateString(date) {
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}

function getTimelineNode(dateString, events) {
    
    //console.log(events[0]);

    var node = $("<li class='work'></li>");

    var input = $("<input class='radio' type='radio' checked></input>").attr("id", dateString);

    var eventLabel = $("<label>Event</label>").attr("for", dateString);
    var otherLabels = $("<span class='date'>"+dateString+"</span><span class='circle'></span>");
    var labels = $("<div class='relative'></div>").append(eventLabel, otherLabels);

    var table = $("<table style='width:100%'></table>");
    var header = $("<tr><th style='text-align: center; border-right: solid 1px #e2e2e2;'>Condition</th><th style='text-align: center; border-right: solid 1px #e2e2e2;'>Observation</th><th style='text-align: center;'>Medication</th></tr>");
    var row = $("<tr></tr>");
    for (i = 0; i < events.length; i++) {
        var condition = ""
        var observation = ""
        var medication = ""
        
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
        row.append($("<td style='text-align: center; border-right: solid 1px #e2e2e2;'>"+condition+"</td>"));
        row.append($("<td style='text-align: center; border-right: solid 1px #e2e2e2;'>"+observation+"</td>"));
        row.append($("<td style='text-align: center; border-right: solid 1px #e2e2e2;'>"+medication+"</td>"));
    }
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

        $("#gender").text(patient.gender);
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
        observation = {
            type: "observation"
        };
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
    $.observations = observations;
});