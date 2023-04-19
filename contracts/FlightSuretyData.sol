pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Variables
    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => Airline) public registeredAirlines;
    uint256 private registeredAirlineCount;
    address[] private registeredAirlineList;
    mapping(address => bool) public fundedAirlines;
    uint256 private fundedAirlineCount;
    mapping(bytes32 => Flight) private flights;
    mapping(address => Insurance[]) private passengers;
    mapping(address => uint256) private payments;
    mapping(bytes32 => address[]) private passengersByFlight;
    mapping(address => bool) private authorizedCallers;
    mapping(address => uint256) private proposedAirlines;


// Constants & Status Codes
    uint256 private constant FUNDING_AMOUNT = 10 ether;
    uint256 private constant MAX_INSURANCE_PRICE = 1 ether;
    uint256 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

// Data structures
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }

    struct Insurance {
        bytes32 flightKey;
        uint256 amount;
        uint256 payout;
        bool isPaid;
    }
    struct Airline {
        bool isRegistered;
        string name;
    }

// Events
    event AirlineRegistered(address indexed airline);
    event AirlineFunded(address indexed airline);
    event InsurancePurchased(address indexed passenger, bytes32 flightKey, uint256 amount);
    event InsurancePaid(address indexed passenger, bytes32 flightKey, uint256 payout);
    event PaymentWithdrawn(address indexed passenger, uint256 amount);
    event CallerAuthorized(address indexed caller);
    event CallerAuthorizationRevoked(address indexed caller);


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor() public {
        contractOwner = msg.sender;
        
        // Initialize Airline 1
        registeredAirlines[0x806734A6F4A9Fb3E7Faf0A62A6710bA6983F86c4] = Airline({
            isRegistered: true, 
            name: "Airline 1"
        });
        registeredAirlineList.push(0x806734A6F4A9Fb3E7Faf0A62A6710bA6983F86c4);
        registeredAirlineCount++;
        fundedAirlines[0x806734A6F4A9Fb3E7Faf0A62A6710bA6983F86c4] = true;
        fundedAirlineCount++;
        
        // Initialize Aireline 2
        registeredAirlines[0xF3da234eAdd895740B186ca45110506ba244CD3D] = Airline({
            isRegistered: true, 
            name: "Airline 2"
        });
        registeredAirlineList.push(0xF3da234eAdd895740B186ca45110506ba244CD3D);
        registeredAirlineCount++;
        fundedAirlines[0xF3da234eAdd895740B186ca45110506ba244CD3D] = true;
        fundedAirlineCount++;
        
        // Set inital payment value for Airline 2
        payments[0xF3da234eAdd895740B186ca45110506ba244CD3D] = 1000000000000000000;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() {
        require(operational, "Contract not operational");
        _;  
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() external view returns(bool) {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    function authorizeCaller(address caller) external requireContractOwner {
        authorizedCallers[caller] = true;
        emit CallerAuthorized(caller);
    }

    function revokeCallerAuthorization(
        address caller
    ) external requireContractOwner {
        authorizedCallers[caller] = false;
        emit CallerAuthorizationRevoked(caller);
    }


    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(
        address newAirline,
        string newName
    ) external requireIsOperational {
       if (registeredAirlineCount < 4) {
            registeredAirlines[newAirline] = Airline ({
                isRegistered: true,
                name: newName
            });
            registeredAirlineList.push(newAirline);
            registeredAirlineCount++;

            emit AirlineRegistered(newAirline);
        } else {
            if (proposedAirlines[newAirline] == 0) {
                proposedAirlines[newAirline] = 1;
            }
        }

        uint256 votes = proposedAirlines[newAirline];

        if (votes * 2 >= registeredAirlineCount) {
            registeredAirlines[newAirline] = Airline ({ 
                isRegistered: true,
                name: newName
            });
            registeredAirlineList.push(newAirline);
            registeredAirlineCount++;
            delete proposedAirlines[newAirline]; // Clear the vote count

            emit AirlineRegistered(newAirline);
        }
    }

    /**
     * @dev Submit funding for airline
     *
     */
     function fund() public payable requireIsOperational {
        
        require(
            msg.value == FUNDING_AMOUNT,
            "Funding amount must equal 10 ether"
        );
        require(
            !fundedAirlines[msg.sender],
            "Airline already provided funding"
        );

        fundedAirlines[msg.sender] = true;
        fundedAirlineCount++;

        emit AirlineFunded(msg.sender);
    }
    

    /**
     * @dev Register a flight.
     *
     */
     function registerFlight(
        address airline,
        string flight,
        uint256 timestamp
     ) external requireIsOperational {
        require(
            registeredAirlines[airline].isRegistered,
            "Airline already registered"
        );
        require(fundedAirlines[airline], "Airline not funded");
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        flights[flightKey] = Flight({
            isRegistered: true,
            statusCode: STATUS_CODE_UNKNOWN,
            updatedTimestamp: timestamp,
            airline: airline
        });
    }



   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buyInsurance(
        address airline,
        string memory flight,
        uint256 timestamp
    ) public payable requireIsOperational {
        require(msg.value > 0, "Payment required");
        require(
            msg.value <= MAX_INSURANCE_PRICE,
            "Maximum price exceeded"
        );

        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        address passenger = msg.sender; // Define the 'passenger' variable before adding it to the array
        passengersByFlight[flightKey].push(passenger); // Add the passenger after defining the variable

        uint256 insuranceAmount = msg.value;
        uint256 payoutAmount = insuranceAmount.mul(3).div(2);

        passengers[passenger].push(
            Insurance({
                flightKey: flightKey,
                amount: insuranceAmount,
                payout: payoutAmount,
                isPaid: false
            })
        );

        emit InsurancePurchased(passenger, flightKey, insuranceAmount);
    }


    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(
        address[] memory insuredPassengers,
        address airline,
        string memory flight,
        uint256 timestamp
    ) public requireIsOperational {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(flights[flightKey].isRegistered, "Flight not registered");
        require(
            flights[flightKey].statusCode == STATUS_CODE_LATE_AIRLINE,
            "Flight is not late due to airline"
        );

        for (uint i = 0; i < insuredPassengers.length; i++) {
            address passenger = insuredPassengers[i];
            for (uint j = 0; j < passengers[passenger].length; j++) {
                Insurance storage insurance = passengers[passenger][j];
                if (insurance.flightKey == flightKey && !insurance.isPaid) {
                    insurance.isPaid = true;
                    payments[passenger] = payments[passenger].add(
                        insurance.payout
                    );
                    emit InsurancePaid(passenger, flightKey, insurance.payout);
                }
            }
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function withdraw() public payable {
        require(payments[msg.sender] > 0, "No funds to withdrawal");

        uint256 paymentAmount = payments[msg.sender];
        payments[msg.sender] = 0;
        msg.sender.transfer(paymentAmount);

        emit PaymentWithdrawn(msg.sender, paymentAmount);
    }

   /**
    * @dev 
    *
    */   

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function getInsuredPassengerCount(
        bytes32 flightKey
    ) external view requireIsOperational returns (uint256) {
        return passengersByFlight[flightKey].length;
    }

    function getInsuredPassenger(
        bytes32 flightKey,
        uint256 index
    ) external view requireIsOperational returns (address) {
        require(
            index < passengersByFlight[flightKey].length,
            "Index out of bounds"
        );
        return passengersByFlight[flightKey][index];
    }

    function getRegisteredAirlines()
        external
        view
        requireIsOperational
        returns (address[] memory)
    {
        return registeredAirlineList;
    }

    function isAirline(
        address airline
    ) external view requireIsOperational returns (bool) {
        return registeredAirlines[airline].isRegistered;
    }

    function setFlightStatus(
        bytes32 flightKey,
        uint8 statusCode
    ) external requireIsOperational {
        require(flights[flightKey].isRegistered, "Flight is not registered");
        flights[flightKey].statusCode = statusCode;
    }

    function getAirlineName(
        address airline
    ) external view requireIsOperational returns (string memory) {
        require(
            registeredAirlines[airline].isRegistered,
            "Airline not registered"
        );
        return registeredAirlines[airline].name;
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() external payable {
        fund();
    }
}

