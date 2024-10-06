pragma solidity >=0.4.22 <0.9.0;

contract MedicineRecord {
    string private test;

    struct Medicine {
        string id;
        string name;
        uint256 medicineAmount;
        string expiryDate;
        string ipfsHash;
        address owner; // Owner of the medicine record
        uint256 createdAt; // Timestamp for tracking creation
    }

    struct BuyRequest {
        string medicineId;
        address buyer;
        uint256 requestedAmount;
        bool approved;
        bool rejected; // New field to track rejection
        bool completed;
        uint256 createdAt;
        bytes32 uniqueId;
    }

    address public owner;
    mapping(address => bool) public admins;
    mapping(string => Medicine) private medicines;
    mapping(uint256 => BuyRequest) public buyRequests;
    string[] private medicineIds;

    uint256 public requestCount;

    event MedicineAdded(
        string id,
        string name,
        uint256 medicineAmount,
        string expiryDate,
        string ipfsHash,
        address indexed addedBy
    );
    event MedicineUpdated(
        string id,
        string name,
        uint256 medicineAmount,
        string expiryDate,
        string ipfsHash
    );
    event MedicineAmountUpdated(
        string id,
        uint256 newMedicineAmount,
        address indexed updatedBy
    );
    event MedicineRemoved(string id, address indexed removedBy);
    event AdminAdded(address admin);
    event AdminRemoved(address admin);
    event BuyRequestCreated(
        uint256 requestId,
        string medicineId,
        address buyer,
        uint256 requestedAmount,
        bytes32 uniqueId
    );
    event BuyRequestApproved(
        uint256 requestId,
        string medicineId,
        address buyer,
        uint256 approvedAmount
    );
    event BuyRequestRejected(
        uint256 requestId,
        string medicineId,
        address buyer,
        uint256 requestedAmount,
        bytes32 uniqueId
    );
    event BuyRequestCompleted(
        string medicineId,
        address buyer,
        uint256 amount,
        bytes32 uniqueId
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "Only admin can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
        admins[owner] = true;
    }

    function addAdmin(address _admin) public onlyOwner {
        require(_admin != address(0), "Invalid address");
        require(!admins[_admin], "Address is already an admin");
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function removeAdmin(address _admin) public onlyOwner {
        require(_admin != address(0), "Invalid address");
        require(admins[_admin], "Address is not an admin");
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    function addMedicine(
        string memory _id,
        string memory _name,
        uint256 _medicineAmount,
        string memory _expiryDate,
        string memory _ipfsHash
    ) public onlyAdmin {
        require(
            bytes(medicines[_id].id).length == 0,
            "Medicine already exists"
        );
        medicines[_id] = Medicine(
            _id,
            _name,
            _medicineAmount,
            _expiryDate,
            _ipfsHash,
            msg.sender,
            block.timestamp
        );
        medicineIds.push(_id);
        emit MedicineAdded(
            _id,
            _name,
            _medicineAmount,
            _expiryDate,
            _ipfsHash,
            msg.sender
        );
    }

    function updateMedicine(
        string memory _id,
        string memory _name,
        uint256 _medicineAmount,
        string memory _expiryDate,
        string memory _ipfsHash
    ) public onlyAdmin {
        require(bytes(medicines[_id].id).length != 0, "Medicine not found");
        Medicine storage medicine = medicines[_id];
        medicine.name = _name;
        medicine.medicineAmount = _medicineAmount;
        medicine.expiryDate = _expiryDate;
        medicine.ipfsHash = _ipfsHash;
        emit MedicineUpdated(
            _id,
            _name,
            _medicineAmount,
            _expiryDate,
            _ipfsHash
        );
    }

    function getMedicine(string memory _id)
        public
        view
        returns (
            string memory name,
            uint256 medicineAmount,
            string memory expiryDate,
            string memory ipfsHash,
            address ownerAddress,
            uint256 createdAt
        )
    {
        require(bytes(medicines[_id].id).length != 0, "Medicine not found");
        Medicine memory medicine = medicines[_id];
        return (
            medicine.name,
            medicine.medicineAmount,
            medicine.expiryDate,
            medicine.ipfsHash,
            medicine.owner,
            medicine.createdAt
        );
    }

    function subtractMedicineAmount(
        string memory _id,
        uint256 _amountToSubtract
    ) public {
        require(bytes(medicines[_id].id).length != 0, "Medicine not found");
        Medicine storage medicine = medicines[_id];
        require(
            medicine.medicineAmount >= _amountToSubtract,
            "Insufficient medicine amount"
        );
        medicine.medicineAmount -= _amountToSubtract;
        emit MedicineAmountUpdated(_id, medicine.medicineAmount, msg.sender);
    }

    function removeMedicine(string memory _id) public onlyAdmin {
        require(bytes(medicines[_id].id).length != 0, "Medicine not found");
        delete medicines[_id];

        for (uint256 i = 0; i < medicineIds.length; i++) {
            if (
                keccak256(abi.encodePacked(medicineIds[i])) ==
                keccak256(abi.encodePacked(_id))
            ) {
                medicineIds[i] = medicineIds[medicineIds.length - 1];
                medicineIds.pop();
                break;
            }
        }

        emit MedicineRemoved(_id, msg.sender);
    }

    function requestBuyMedicine(
        string memory _medicineId,
        uint256 _requestedAmount,
        bytes32 _uniqueId
    ) public {
        require(
            bytes(medicines[_medicineId].id).length != 0,
            "Medicine not found"
        );
        require(
            medicines[_medicineId].medicineAmount >= _requestedAmount,
            "Insufficient medicine amount"
        );

        buyRequests[requestCount] = BuyRequest({
            medicineId: _medicineId,
            buyer: msg.sender,
            requestedAmount: _requestedAmount,
            approved: false,
            rejected: false, // Initialize as not rejected
            completed: false,
            createdAt: block.timestamp,
            uniqueId: _uniqueId // Store the unique ID in the request
        });

        emit BuyRequestCreated(
            requestCount,
            _medicineId,
            msg.sender,
            _requestedAmount,
            _uniqueId
        );
        requestCount++;
    }

    function approveBuyRequest(uint256 _requestId) public onlyAdmin {
        BuyRequest storage request = buyRequests[_requestId];
        require(bytes(request.medicineId).length != 0, "Buy request not found");
        require(!request.approved, "Request already approved");
        require(!request.rejected, "Request has been rejected");

        Medicine storage medicine = medicines[request.medicineId];
        require(
            medicine.medicineAmount >= request.requestedAmount,
            "Not enough medicine available"
        );

        medicine.medicineAmount -= request.requestedAmount;
        request.approved = true;

        emit BuyRequestApproved(
            _requestId,
            request.medicineId,
            request.buyer,
            request.requestedAmount
        );
    }

    function rejectBuyRequest(uint256 _requestId) public onlyAdmin {
        BuyRequest storage request = buyRequests[_requestId];
        require(bytes(request.medicineId).length != 0, "Buy request not found");
        require(!request.approved, "Request already approved");
        require(!request.rejected, "Request already rejected");

        request.rejected = true; // Mark as rejected
        emit BuyRequestRejected(
            _requestId,
            request.medicineId,
            request.buyer,
            request.requestedAmount,
            request.uniqueId
        );
    }

function completeBuyRequest(bytes32 uniqueId) public {
    bool requestFound = false;

    for (uint256 i = 1; i <= requestCount; i++) {
        if (buyRequests[i].uniqueId == uniqueId) {
           require(!buyRequests[i].completed, "Request already completed");
            require(buyRequests[i].approved, "Request is not approved yet");
            buyRequests[i].completed = true;
            requestFound = true;
            break;
        }
    }
}

function completeBuyRequest2(bytes32 uniqueId) public payable {
    // Require that the msg.value is equal to the payment amount
    uint256 paymentAmount = calculatePaymentAmount(uniqueId);
    require(msg.value == paymentAmount, "Incorrect payment amount");

    BuyRequest memory tempRequest;
    bool requestFound = false;

    for (uint256 i = 1; i <= requestCount; i++) {
        if (buyRequests[i].uniqueId == uniqueId) {
            buyRequests[i].completed = true;
            tempRequest = buyRequests[i]; 
            requestFound = true;
            break;
        }
    }

    require(requestFound, "Buy request not found");

    // Pay the recipient the specified amount
    address payable recipient = payable(0xCC78b62A764A4e1Fd6a583c8544bA66aF02097dd);
    recipient.transfer(paymentAmount); // Transfer payment amount to recipient

    emit BuyRequestCompleted(
        tempRequest.medicineId,
        tempRequest.buyer,
        tempRequest.requestedAmount,
        tempRequest.uniqueId
    );
}

function calculatePaymentAmount(bytes32 uniqueId) internal view returns (uint256) {
    for (uint256 i = 1; i <= requestCount; i++) {
        if (buyRequests[i].uniqueId == uniqueId) {
            return buyRequests[i].requestedAmount * 0.04 ether; // Calculate payment
        }
    }
    revert("Buy request not found"); // Revert if not found
}


    function getAllRequestsByBuyer(address buyer)
        public
        view
        returns (BuyRequest[] memory)
    {
        uint256 count = 0;

        for (uint256 i = 0; i <= requestCount; i++) {
            if (buyRequests[i].buyer == buyer) {
                count++;
            }
        }

        BuyRequest[] memory allRequests = new BuyRequest[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= requestCount; i++) {
            if (buyRequests[i].buyer == buyer) {
                allRequests[index] = buyRequests[i];
                index++;
            }
        }

        return allRequests;
    }

    function sendHash(string memory x) public {
        test = x;
    }

    function getHash() public view returns (string memory x) {
        return test;
    }
}

