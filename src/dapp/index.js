
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    
        // Register a new airline
        console.log("Adding event listener for #register-airline-form");

        document.querySelector('#register-airline-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            let newAirlineAddress = DOM.elid('new-airline-address').value;
            let newAirlineName = DOM.elid('new-airline-name').value;
            await contract.registerAirline(newAirlineAddress, newAirlineName);
});

        // Submit airline funding
        console.log("Adding event listener for #airline-funding-form");

        document.querySelector('#airline-funding-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            let airlineAddress = DOM.elid('funding-airline-address').value;
            let fundingAmount = DOM.elid('funding-amount').value;
            await contract.submitAirlineFunding(airlineAddress, fundingAmount);
});

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })
    
        // Purchase insurance
        console.log("Adding event listener for #purchase-insurance-form");

        document.querySelector('#purchase-insurance-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            let airlineAddress = DOM.elid('airline-address').value;
            let flightNumber = DOM.elid('purchase-flight-number').value;
            let insuranceAmount = DOM.elid('insurance-amount').value;
            await contract.purchaseInsurance(airlineAddress, flightNumber, insuranceAmount);
        });

        // Withdraw insurance payout
        console.log("Adding event listener for #withdraw-funds");

        DOM.elid('withdraw-funds').addEventListener('click', async () => {
            await contract.withdrawInsurancePayout();
        });

    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







