import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Float "mo:core/Float";
import Time "mo:core/Time";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import UserApproval "user-approval/approval";



actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userApproval = UserApproval.initState(accessControlState);

  let inventory = Map.empty<Text, InventoryItem>();
  let challans = Map.empty<Text, Challan>();
  let payments = Map.empty<Text, Payment>();
  let pettyCashRecords = Map.empty<Int, PettyCash>();
  let pettyCashAttachments = Map.empty<Int, [PettyCashAttachment]>();
  let clients = Map.empty<Text, Client>();
  let staffAdvances = Map.empty<Text, StaffAdvance>();
  let cashEquivalents = Map.empty<Text, CashEquivalent>();

  include MixinStorage();

  let buildTime = Time.now();
  let gitCommitHash : Text = "4e9dc5a4f88b290f0c42c7eae50598689f80d542";
  let isTestEnv : Bool = false;

  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // Any authenticated user (including guests checking their own profile) can read their profile.
  // No sensitive data exposed here.
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  // Saving a profile requires at least #user role (approved user or admin).
  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Anyone can check their own approval status (needed for the login flow).
  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(userApproval, caller);
  };

  // Any authenticated (non-anonymous) principal can request approval.
  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(userApproval, caller);
  };

  // Only admins can approve/reject users.
  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(userApproval, user, status);
  };

  // Only admins can list all approval requests.
  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(userApproval);
  };

  public type InventoryItem = {
    name : Text;
    totalQuantity : Float;
    issuedQuantity : Float;
    availableQuantity : Float;
    dailyRate : Float;
  };

  public type ChallanItem = {
    itemName : Text;
    quantity : Float;
    rate : Float;
    rentalDays : Float;
  };

  public type Challan = {
    id : Text;
    clientName : Text;
    venue : Text;
    items : [ChallanItem];
    freight : Float;
    numberOfDays : Float;
    returned : Bool;
    rentDate : Int;
    site : Text;
    creationDate : Int;
  };

  public type Payment = {
    id : Text;
    date : Int;
    client : Text;
    mode : Text;
    amount : Float;
    referenceNumber : Text;
    createdAt : Int;
    site : Text;
  };

  public type PettyCashCategory = {
    title : Text;
    amount : Float;
  };

  public type PettyCash = {
    date : Int;
    openingBalance : Float;
    cashFromMd : Float;
    expenses : Float;
    staffAdvance : Float;
    handoverToMd : Float;
    netChange : Float;
    closingBalance : Float;
    transferFromCashEquivalents : Float;
    categoryExpenses : [PettyCashCategory];
    remarks : Text;
    createdAt : Int;
    cashReceivedAuto : Float;
  };

  public type Client = {
    name : Text;
    createdAt : Int;
  };

  public type BulkChallanCreateResult = {
    id : Text;
    success : Bool;
    error : ?Text;
    created : ?Challan;
  };

  public type PaymentBulkCreateResult = {
    id : Text;
    success : Bool;
    error : ?Text;
    created : ?Payment;
  };

  public type PettyCashBulkCreateResult = {
    date : Int;
    success : Bool;
    error : ?Text;
    created : ?PettyCash;
  };

  public type ClientBulkCreateResult = {
    name : Text;
    success : Bool;
    error : ?Text;
    created : ?Client;
  };

  public type InventoryBulkCreateResult = {
    name : Text;
    success : Bool;
    error : ?Text;
    created : ?InventoryItem;
  };

  public type PettyCashAttachment = {
    id : Text;
    blob : Storage.ExternalBlob;
  };

  public type PettyCashWithAttachments = {
    pettyCash : PettyCash;
    attachments : [PettyCashAttachment];
  };

  public type StaffAdvance = {
    employeeName : Text;
    amount : Float;
    date : Int;
    status : AdvanceStatus;
  };

  public type AdvanceStatus = {
    #pending;
    #approved;
    #rejected;
    #settled;
  };

  public type CashEquivalent = {
    id : Text;
    source : Text;
    amount : Float;
    equivalentType : EquivalentType;
    remarks : Text;
  };

  public type EquivalentType = {
    #digital;
    #cashCheck;
    #creditCard;
    #other : Text;
  };

  public type BuildMetadata = {
    buildTime : Int;
    gitCommitHash : Text;
    canisterId : Text;
    isTestEnv : Bool;
  };

  // Build metadata and health check are open to everyone (no sensitive data).
  public query ({ caller }) func getBuildMetadata() : async BuildMetadata {
    {
      buildTime;
      gitCommitHash;
      canisterId = "bkyz2-fmaaa-aaaaa-qaaaq-cai";
      isTestEnv;
    };
  };

  public query ({ caller }) func healthCheck() : async Int {
    buildTime;
  };

  // ── Clients ──────────────────────────────────────────────────────────────────

  // Approved users and admins can add clients.
  public shared ({ caller }) func addClient(name : Text, createdAt : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can add clients");
    };
    switch (clients.get(name)) {
      case (?_) { Runtime.trap("Client already exists") };
      case (null) {
        let client : Client = {
          name;
          createdAt;
        };
        clients.add(name, client);
      };
    };
  };

  // Only admins can delete clients.
  public shared ({ caller }) func deleteClient(name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete clients");
    };
    clients.remove(name);
  };

  // Only admins can bulk-create clients (bulk upload is admin-only per the plan).
  public shared ({ caller }) func bulkCreateClients(batch : [Client]) : async [ClientBulkCreateResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can bulk create clients");
    };
    let results = batch.map(
      func(request) {
        switch (clients.get(request.name)) {
          case (null) {
            clients.add(request.name, request);
            {
              name = request.name;
              success = true;
              error = null;
              created = ?request;
            };
          };
          case (?_) {
            {
              name = request.name;
              success = false;
              error = ?"Client already exists";
              created = null;
            };
          };
        };
      }
    );
    results;
  };

  // Approved users and admins can read clients.
  public query ({ caller }) func getAllClients() : async [Client] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view clients");
    };
    clients.values().toArray();
  };

  // ── Inventory ────────────────────────────────────────────────────────────────

  func calculateIssuedQuantity(_itemName : Text) : Float {
    0.0;
  };

  // Only admins can add inventory items.
  public shared ({ caller }) func addInventoryItem(name : Text, totalQuantity : Float, dailyRate : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add inventory items");
    };
    if (totalQuantity <= 0) {
      Runtime.trap("Total quantity must be greater than 0");
    };
    if (dailyRate <= 0) {
      Runtime.trap("Daily rate must be greater than 0");
    };
    switch (inventory.get(name)) {
      case (?_) { Runtime.trap("Inventory item with this name already exists") };
      case (null) {
        let newItem : InventoryItem = {
          name;
          totalQuantity;
          issuedQuantity = 0.0;
          availableQuantity = totalQuantity;
          dailyRate;
        };
        inventory.add(name, newItem);
      };
    };
  };

  // Only admins can update inventory items.
  public shared ({ caller }) func updateInventoryItem(name : Text, totalQuantity : Float, dailyRate : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update inventory items");
    };
    if (totalQuantity <= 0) {
      Runtime.trap("Total quantity must be greater than 0");
    };
    if (dailyRate <= 0) {
      Runtime.trap("Daily rate must be greater than 0");
    };

    let issuedQuantity = calculateIssuedQuantity(name);
    let availableQuantity = totalQuantity - issuedQuantity;
    let updatedItem : InventoryItem = {
      name;
      totalQuantity;
      issuedQuantity;
      availableQuantity;
      dailyRate;
    };
    inventory.add(name, updatedItem);
  };

  // Only admins can delete inventory items.
  public shared ({ caller }) func deleteInventoryItem(name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete inventory items");
    };
    inventory.remove(name);
  };

  // Only admins can bulk-create inventory items.
  public shared ({ caller }) func bulkCreateInventoryItems(batch : [InventoryItem]) : async [InventoryBulkCreateResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can bulk create inventory items");
    };
    batch.map(
      func(item) {
        if (item.totalQuantity <= 0) {
          {
            name = item.name;
            success = false;
            error = ?"Total quantity must be greater than 0";
            created = null;
          };
        } else if (item.dailyRate <= 0) {
          {
            name = item.name;
            success = false;
            error = ?"Daily rate must be greater than 0";
            created = null;
          };
        } else {
          switch (inventory.get(item.name)) {
            case (?_) {
              {
                name = item.name;
                success = false;
                error = ?"Inventory item with this name already exists";
                created = null;
              };
            };
            case (null) {
              let newItem : InventoryItem = {
                item with
                issuedQuantity = 0.0;
                availableQuantity = item.totalQuantity;
              };
              inventory.add(item.name, newItem);
              {
                name = item.name;
                success = true;
                error = null;
                created = ?newItem;
              };
            };
          };
        };
      }
    );
  };

  // Approved users and admins can read inventory.
  public query ({ caller }) func getInventory() : async [InventoryItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view inventory");
    };
    inventory.values().toArray();
  };

  // ── Challans ─────────────────────────────────────────────────────────────────

  func checkDuplicateChallanItems(items : [ChallanItem]) {
    let seenItems = Map.empty<Text, ()>();
    for (item in items.values()) {
      switch (seenItems.get(item.itemName)) {
        case (null) {
          seenItems.add(item.itemName, ());
        };
        case (?_) {
          Runtime.trap("Duplicate item found: " # item.itemName);
        };
      };
    };
  };

  // Approved users and admins can create challans.
  public shared ({ caller }) func createChallan(
    id : Text,
    clientName : Text,
    venue : Text,
    items : [ChallanItem],
    freight : Float,
    numberOfDays : Float,
    rentDate : Int,
    site : Text,
    creationDate : Int,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can create challans");
    };
    checkDuplicateChallanItems(items);

    switch (clients.get(clientName)) {
      case (null) {
        let newClient : Client = {
          name = clientName;
          createdAt = rentDate;
        };
        clients.add(clientName, newClient);
      };
      case (_) {};
    };

    let newChallan : Challan = {
      id;
      clientName;
      venue;
      items;
      freight;
      numberOfDays;
      returned = false;
      rentDate;
      site;
      creationDate;
    };
    challans.add(id, newChallan);
  };

  // Approved users and admins can update challans (returned challans are locked).
  public shared ({ caller }) func updateChallan(
    id : Text,
    clientName : Text,
    venue : Text,
    items : [ChallanItem],
    freight : Float,
    numberOfDays : Float,
    rentDate : Int,
    site : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can update challans");
    };
    checkDuplicateChallanItems(items);

    let oldChallan = switch (challans.get(id)) {
      case (?challan) { challan };
      case (null) { Runtime.trap("Challan not found") };
    };

    if (oldChallan.returned) {
      Runtime.trap("Cannot update a returned challan");
    };

    let updatedChallan : Challan = {
      id;
      clientName;
      venue;
      items;
      freight;
      numberOfDays;
      returned = false;
      rentDate;
      site;
      creationDate = oldChallan.creationDate;
    };
    challans.add(id, updatedChallan);
  };

  // Only admins can delete challans.
  public shared ({ caller }) func deleteChallan(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete challans");
    };
    challans.remove(id);
  };

  // Approved users and admins can mark challans as returned.
  public shared ({ caller }) func markChallanReturned(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can mark challans as returned");
    };
    switch (challans.get(id)) {
      case (?challan) {
        if (challan.returned) {
          Runtime.trap("Challan is already marked as returned");
        };
        let updatedChallan : Challan = { challan with returned = true };
        challans.add(id, updatedChallan);
      };
      case (null) {
        Runtime.trap("Challan not found");
      };
    };
  };

  // Only admins can revert challans (and the operation is intentionally blocked).
  public shared ({ caller }) func revertChallanToActive(_id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can attempt to revert challans");
    };
    Runtime.trap("Cannot revert a returned challan to active. If this is required, contact the admin for further assistance.");
  };

  // Only admins can bulk-create challans (bulk upload is admin-only per the plan).
  public shared ({ caller }) func bulkCreateChallans(batch : [Challan]) : async [BulkChallanCreateResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can bulk create challans");
    };
    batch.map<Challan, BulkChallanCreateResult>(
      func(request) {
        switch (clients.get(request.clientName)) {
          case (null) {
            let newClient : Client = {
              name = request.clientName;
              createdAt = request.rentDate;
            };
            clients.add(request.clientName, newClient);
          };
          case (?_) {};
        };

        let updatedChallan : Challan = {
          request with
          returned = false;
          rentDate = request.rentDate;
          creationDate = request.creationDate;
        };
        challans.add(request.id, updatedChallan);

        {
          id = request.id;
          success = true;
          error = null;
          created = ?updatedChallan;
        };
      }
    );
  };

  // Approved users and admins can read challans.
  public query ({ caller }) func getAllChallans() : async [Challan] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view challans");
    };
    challans.values().toArray();
  };

  public query ({ caller }) func getChallansByClient(client : Text) : async [Challan] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view challans");
    };
    challans.values().toArray().filter(func(challan) { challan.clientName == client });
  };

  public query ({ caller }) func getChallansByDateRange(startDate : Int, endDate : Int) : async [Challan] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view challans");
    };
    challans.values().toArray().filter(func(challan) { challan.rentDate >= startDate and challan.rentDate <= endDate });
  };

  // ── Payments ─────────────────────────────────────────────────────────────────

  // Approved users and admins can add payments.
  public shared ({ caller }) func addPayment(
    id : Text,
    date : Int,
    client : Text,
    mode : Text,
    amount : Float,
    referenceNumber : Text,
    createdAt : Int,
    site : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can add payments");
    };
    let payment : Payment = {
      id;
      date;
      client;
      mode;
      amount;
      referenceNumber;
      createdAt;
      site;
    };
    payments.add(id, payment);
  };

  // Only admins can bulk-add payments (bulk upload is admin-only per the plan).
  public shared ({ caller }) func bulkAddPayments(batch : [Payment]) : async [PaymentBulkCreateResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can bulk add payments");
    };
    batch.map(
      func(payment) {
        payments.add(payment.id, payment);
        {
          id = payment.id;
          success = true;
          error = null;
          created = ?payment;
        };
      }
    );
  };

  // Approved users and admins can read payments.
  public query ({ caller }) func getAllPayments() : async [Payment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view payments");
    };
    payments.values().toArray();
  };

  public query ({ caller }) func getPaymentsByClient(client : Text) : async [Payment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view payments");
    };
    payments.values().toArray().filter(func(payment) { payment.client == client });
  };

  public query ({ caller }) func getPaymentsByDateRange(startDate : Int, endDate : Int) : async [Payment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view payments");
    };
    payments.values().toArray().filter(func(payment) { payment.date >= startDate and payment.date <= endDate });
  };

  // ── Petty Cash ───────────────────────────────────────────────────────────────

  func calculateNetChangeAndClosingBalance(record : PettyCash) : (Float, Float) {
    let netChange = record.openingBalance +
      record.cashFromMd +
      record.transferFromCashEquivalents +
      record.cashReceivedAuto -
      record.expenses -
      record.staffAdvance -
      record.handoverToMd;
    (netChange, netChange);
  };

  // Approved users and admins can add petty cash records.
  public shared ({ caller }) func addPettyCash(
    date : Int,
    openingBalance : Float,
    cashFromMd : Float,
    expenses : Float,
    staffAdvance : Float,
    handoverToMd : Float,
    transferFromCashEquivalents : Float,
    categoryExpenses : [PettyCashCategory],
    remarks : Text,
    cashReceivedAuto : Float,
    createdAt : Int,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can add petty cash records");
    };
    let newRecord : PettyCash = {
      date;
      openingBalance;
      cashFromMd;
      expenses;
      staffAdvance;
      handoverToMd;
      netChange = 0.0;
      closingBalance = 0.0;
      transferFromCashEquivalents;
      categoryExpenses;
      remarks;
      createdAt;
      cashReceivedAuto;
    };
    let (netChange, closingBalance) = calculateNetChangeAndClosingBalance(newRecord);
    let updatedRecord : PettyCash = { newRecord with netChange; closingBalance };
    pettyCashRecords.add(date, updatedRecord);
  };

  // Approved users and admins can update petty cash records.
  public shared ({ caller }) func updatePettyCash(
    originalDate : Int,
    openingBalance : Float,
    cashFromMd : Float,
    expenses : Float,
    staffAdvance : Float,
    handoverToMd : Float,
    transferFromCashEquivalents : Float,
    categoryExpenses : [PettyCashCategory],
    remarks : Text,
    cashReceivedAuto : Float,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can update petty cash records");
    };
    switch (pettyCashRecords.get(originalDate)) {
      case (?existing) {
        let newRecord : PettyCash = {
          date = originalDate;
          openingBalance;
          cashFromMd;
          expenses;
          staffAdvance;
          handoverToMd;
          netChange = 0.0;
          closingBalance = 0.0;
          transferFromCashEquivalents;
          categoryExpenses;
          remarks;
          createdAt = existing.createdAt;
          cashReceivedAuto;
        };
        let (netChange, closingBalance) = calculateNetChangeAndClosingBalance(newRecord);
        let updatedRecord = { newRecord with netChange; closingBalance };
        pettyCashRecords.add(originalDate, updatedRecord);
      };
      case (null) {
        Runtime.trap("Petty cash record not found for the specified date");
      };
    };
  };

  // Only admins can delete petty cash records.
  public shared ({ caller }) func deletePettyCash(date : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete petty cash records");
    };
    pettyCashRecords.remove(date);
  };

  // Only admins can bulk-add petty cash records (bulk upload is admin-only per the plan).
  public shared ({ caller }) func bulkAddPettyCash(batch : [PettyCash]) : async [PettyCashBulkCreateResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can bulk add petty cash records");
    };
    batch.map(
      func(record) {
        switch (pettyCashRecords.get(record.date)) {
          case (null) {
            let (netChange, closingBalance) = calculateNetChangeAndClosingBalance(record);
            let updatedRecord = { record with netChange; closingBalance };
            pettyCashRecords.add(record.date, updatedRecord);
            {
              date = record.date;
              success = true;
              error = null;
              created = ?updatedRecord;
            };
          };
          case (?_) {
            {
              date = record.date;
              success = false;
              error = ?"Petty cash record already exists for this date";
              created = null;
            };
          };
        };
      }
    );
  };

  // Approved users and admins can read petty cash records.
  public query ({ caller }) func getAllPettyCashRecords() : async [PettyCash] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view petty cash records");
    };
    pettyCashRecords.values().toArray();
  };

  public query ({ caller }) func getPettyCashByDateRange(startDate : Int, endDate : Int) : async [PettyCash] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view petty cash records");
    };
    pettyCashRecords.values().toArray().filter(func(record) { record.date >= startDate and record.date <= endDate });
  };

  public query ({ caller }) func getAllPettyCashRecordsWithAttachments() : async [PettyCashWithAttachments] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view petty cash records");
    };
    let pettyCashIter = pettyCashRecords.entries();
    pettyCashIter.toArray().map(
      func((date, record)) {
        let attachments = switch (pettyCashAttachments.get(date)) {
          case (?atts) { atts };
          case (null) { [] };
        };
        {
          pettyCash = record;
          attachments;
        };
      }
    );
  };

  // ── Petty Cash Attachments ───────────────────────────────────────────────────

  // Approved users and admins can read attachments.
  public query ({ caller }) func getAttachmentsForPettyCashRecord(date : Int) : async [PettyCashAttachment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can view petty cash attachments");
    };
    switch (pettyCashAttachments.get(date)) {
      case (?attachments) { attachments };
      case (null) { [] };
    };
  };

  // Approved users and admins can add attachments.
  public shared ({ caller }) func addAttachmentToPettyCashRecord(date : Int, attachment : PettyCashAttachment) : async [PettyCashAttachment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can add attachments to petty cash records");
    };
    switch (pettyCashAttachments.get(date)) {
      case (?existing) {
        let newAttachments = existing.concat([attachment]);
        pettyCashAttachments.add(date, newAttachments);
        newAttachments;
      };
      case (null) {
        let newAttachments = [attachment];
        pettyCashAttachments.add(date, newAttachments);
        newAttachments;
      };
    };
  };

  // Approved users and admins can remove individual attachments.
  public shared ({ caller }) func removeAttachmentFromPettyCashRecord(date : Int, attachmentId : Text) : async [PettyCashAttachment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only approved users can remove attachments from petty cash records");
    };
    switch (pettyCashAttachments.get(date)) {
      case (?existing) {
        let filteredAttachments = existing.filter(func(att) { att.id != attachmentId });
        pettyCashAttachments.add(date, filteredAttachments);
        filteredAttachments;
      };
      case (null) { [] };
    };
  };

  // Only admins can clear all attachments for a petty cash record.
  public shared ({ caller }) func clearPettyCashAttachments(date : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can clear petty cash attachments");
    };
    pettyCashAttachments.remove(date);
  };
};
