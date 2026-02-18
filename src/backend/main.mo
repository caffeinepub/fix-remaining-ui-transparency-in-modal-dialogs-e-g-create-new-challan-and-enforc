import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Float "mo:core/Float";
import Time "mo:core/Time";
import List "mo:core/List";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import UserApproval "user-approval/approval";

actor {
  let accessControlState = AccessControl.initState();
  let approvalState = UserApproval.initState(accessControlState);
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  let userProfiles = Map.empty<Principal, UserProfile>();
  let inventory = Map.empty<Text, InventoryItem>();
  let challans = Map.empty<Text, Challan>();
  let payments = Map.empty<Text, Payment>();
  let pettyCashRecords = Map.empty<Int, PettyCash>();
  let pettyCashAttachments = Map.empty<Int, [PettyCashAttachment]>();
  let clients = Map.empty<Text, Client>();

  let buildTime = Time.now();
  let gitCommitHash : Text = "4e9dc5a4f88b290f0c42c7eae50598689f80d542";
  var bootstrapAdmins = List.empty<Principal>();

  public type UserProfile = {
    name : Text;
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

  public type BuildMetadata = {
    buildTime : Int;
    gitCommitHash : Text;
    canisterId : Principal;
  };

  public type BecomeAdminResponse = {
    success : Bool;
    isAlreadyAdmin : Bool;
    error : ?Text;
  };

  func ensureApprovedUser(caller : Principal) {
    if (not isAdmin(caller) and not UserApproval.isApproved(approvalState, caller)) {
      Runtime.trap("Access denied. Your account is not approved. Please request access with `backend.requestAccess`. Contact an admin if you need help!");
    };
  };

  func ensureAdmin(caller : Principal) {
    if (not isAdmin(caller)) {
      Runtime.trap("Only admins can perform this action!");
    };
  };

  func isAdmin(caller : Principal) : Bool {
    isAdminOrBootstrapAdmin(caller);
  };

  public query ({ caller }) func isBootstrapAdmin() : async Bool {
    isBootstrapAdminInternal(caller);
  };

  public query ({ caller }) func isAdminOrBootstrapAdminExternal() : async Bool {
    isAdminOrBootstrapAdmin(caller);
  };

  func isBootstrapAdminInternal(caller : Principal) : Bool {
    bootstrapAdmins.values().any(func(p) { p == caller });
  };

  func isAdminOrBootstrapAdmin(caller : Principal) : Bool {
    isBootstrapAdminInternal(caller) or AccessControl.getUserRole(accessControlState, caller) == #admin;
  };

  public shared ({ caller }) func becomeBootstrapAdmin(isAdminDomain : Bool) : async BecomeAdminResponse {
    if (isBootstrapAdminInternal(caller)) {
      return {
        success = true;
        isAlreadyAdmin = true;
        error = ?"You are already a bootstrap admin!";
      };
    };

    if (not isAdminDomain) {
      return {
        success = false;
        isAlreadyAdmin = false;
        error = ?"VISIBLE BUG: You must call this from the admin domain only";
      };
    };

    switch (bootstrapAdmins.values().next()) {
      case (null) {
        // No bootstrap admins yet, add caller as the first one
        bootstrapAdmins.add(caller);
        {
          success = true;
          isAlreadyAdmin = false;
          error = null;
        };
      };
      case (?existingAdmin) {
        if (existingAdmin == caller) {
          {
            success = true;
            isAlreadyAdmin = true;
            error = null;
          };
        } else {
          {
            success = false;
            isAlreadyAdmin = false;
            error = ?"Only a single bootstrap admin is supported currently.";
          };
        };
      };
    };
  };

  func calculateIssuedQuantity(_itemName : Text) : Float {
    0.0;
  };

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

  public shared ({ caller }) func addClient(name : Text, createdAt : Int) : async () {
    ensureApprovedUser(caller);
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

  public shared ({ caller }) func deleteClient(name : Text) : async () {
    ensureAdmin(caller);
    clients.remove(name);
  };

  public query ({ caller }) func getAllClients() : async [Client] {
    ensureApprovedUser(caller);
    clients.values().toArray();
  };

  public shared ({ caller }) func bulkCreateClients(batch : [Client]) : async [ClientBulkCreateResult] {
    ensureAdmin(caller);

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

  public shared ({ caller }) func addInventoryItem(name : Text, totalQuantity : Float, dailyRate : Float) : async () {
    ensureApprovedUser(caller);
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

  public shared ({ caller }) func updateInventoryItem(name : Text, totalQuantity : Float, dailyRate : Float) : async () {
    ensureApprovedUser(caller);
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

  public shared ({ caller }) func deleteInventoryItem(name : Text) : async () {
    ensureAdmin(caller);
    inventory.remove(name);
  };

  public query ({ caller }) func getInventory() : async [InventoryItem] {
    ensureApprovedUser(caller);
    inventory.values().toArray();
  };

  public shared ({ caller }) func createBulkChallans(batch : [Challan]) : async [BulkChallanCreateResult] {
    ensureAdmin(caller);
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

  public shared ({ caller }) func createChallan(id : Text, clientName : Text, venue : Text, items : [ChallanItem], freight : Float, numberOfDays : Float, rentDate : Int, site : Text, creationDate : Int) : async () {
    ensureApprovedUser(caller);
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

  public shared ({ caller }) func updateChallan(id : Text, clientName : Text, venue : Text, items : [ChallanItem], freight : Float, numberOfDays : Float, rentDate : Int, site : Text) : async () {
    ensureApprovedUser(caller);
    checkDuplicateChallanItems(items);

    switch (challans.get(id)) {
      case (?oldChallan) {
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
      case (null) {
        Runtime.trap("Challan not found");
      };
    };
  };

  public shared ({ caller }) func deleteChallan(id : Text) : async () {
    ensureAdmin(caller);
    switch (challans.get(id)) {
      case (?challan) {
        if (challan.returned) {
          Runtime.trap("Cannot delete a challan that is marked as returned");
        };
        challans.remove(id);
      };
      case (null) {
        Runtime.trap("Challan not found");
      };
    };
  };

  public shared ({ caller }) func markChallanReturned(id : Text) : async () {
    ensureApprovedUser(caller);
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

  public query ({ caller }) func getAttachmentsForPettyCashRecord(date : Int) : async [PettyCashAttachment] {
    ensureApprovedUser(caller);
    switch (pettyCashAttachments.get(date)) {
      case (?attachments) { attachments };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func addAttachmentToPettyCashRecord(date : Int, attachment : PettyCashAttachment) : async [PettyCashAttachment] {
    ensureApprovedUser(caller);
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

  public shared ({ caller }) func removeAttachmentFromPettyCashRecord(date : Int, attachmentId : Text) : async [PettyCashAttachment] {
    ensureApprovedUser(caller);
    switch (pettyCashAttachments.get(date)) {
      case (?existing) {
        let filteredAttachments = existing.filter(func(att) { att.id != attachmentId });
        pettyCashAttachments.add(date, filteredAttachments);
        filteredAttachments;
      };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func clearPettyCashAttachments(date : Int) : async () {
    ensureApprovedUser(caller);
    pettyCashAttachments.remove(date);
  };

  public shared ({ caller }) func revertChallanToActive(_id : Text) : async () {
    ensureApprovedUser(caller);
    Runtime.trap("Cannot revert a returned challan to active. If this is required, contact the admin for further assistance.");
  };

  public shared ({ caller }) func bulkAddPayments(batch : [Payment]) : async [PaymentBulkCreateResult] {
    ensureAdmin(caller);
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

  public shared ({ caller }) func addPayment(id : Text, date : Int, client : Text, mode : Text, amount : Float, referenceNumber : Text, createdAt : Int, site : Text) : async () {
    ensureApprovedUser(caller);
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

  public shared ({ caller }) func bulkAddPettyCash(batch : [PettyCash]) : async [PettyCashBulkCreateResult] {
    ensureAdmin(caller);
    batch.map(
      func(record) {
        switch (pettyCashRecords.get(record.date)) {
          case (null) {
            pettyCashRecords.add(record.date, record);
            {
              date = record.date;
              success = true;
              error = null;
              created = ?record;
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

  public shared ({ caller }) func addPettyCash(date : Int, openingBalance : Float, cashFromMd : Float, expenses : Float, staffAdvance : Float, handoverToMd : Float, netChange : Float, closingBalance : Float, transferFromCashEquivalents : Float, categoryExpenses : [PettyCashCategory], remarks : Text, createdAt : Int) : async () {
    ensureApprovedUser(caller);
    switch (pettyCashRecords.get(date)) {
      case (?_) { Runtime.trap("A petty cash record already exists for this date") };
      case (null) {
        let record : PettyCash = {
          date;
          openingBalance;
          cashFromMd;
          expenses;
          staffAdvance;
          handoverToMd;
          netChange;
          closingBalance;
          transferFromCashEquivalents;
          categoryExpenses;
          remarks;
          createdAt;
        };
        pettyCashRecords.add(date, record);
      };
    };
  };

  public shared ({ caller }) func updatePettyCash(originalDate : Int, openingBalance : Float, cashFromMd : Float, expenses : Float, staffAdvance : Float, handoverToMd : Float, netChange : Float, closingBalance : Float, transferFromCashEquivalents : Float, categoryExpenses : [PettyCashCategory], remarks : Text) : async () {
    ensureApprovedUser(caller);
    switch (pettyCashRecords.get(originalDate)) {
      case (?existing) {
        let updatedRecord : PettyCash = {
          date = originalDate;
          openingBalance;
          cashFromMd;
          expenses;
          staffAdvance;
          handoverToMd;
          netChange;
          closingBalance;
          transferFromCashEquivalents;
          categoryExpenses;
          remarks;
          createdAt = existing.createdAt;
        };
        pettyCashRecords.add(originalDate, updatedRecord);
      };
      case (null) {
        Runtime.trap("Petty cash record not found for the specified date");
      };
    };
  };

  public shared ({ caller }) func deletePettyCash(date : Int) : async () {
    ensureAdmin(caller);
    pettyCashRecords.remove(date);
  };

  public query ({ caller }) func getAllChallans() : async [Challan] {
    ensureApprovedUser(caller);
    challans.values().toArray();
  };

  public query ({ caller }) func getAllPayments() : async [Payment] {
    ensureApprovedUser(caller);
    payments.values().toArray();
  };

  public query ({ caller }) func getAllPettyCashRecords() : async [PettyCash] {
    ensureApprovedUser(caller);
    pettyCashRecords.values().toArray();
  };

  public query ({ caller }) func getAllPettyCashRecordsWithAttachments() : async [PettyCashWithAttachments] {
    ensureApprovedUser(caller);
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

  public query ({ caller }) func getChallansByClient(client : Text) : async [Challan] {
    ensureApprovedUser(caller);
    challans.values().toArray().filter(func(challan) { challan.clientName == client });
  };

  public query ({ caller }) func getPaymentsByClient(client : Text) : async [Payment] {
    ensureApprovedUser(caller);
    payments.values().toArray().filter(func(payment) { payment.client == client });
  };

  public query ({ caller }) func getPaymentsByDateRange(startDate : Int, endDate : Int) : async [Payment] {
    ensureApprovedUser(caller);
    payments.values().toArray().filter(func(payment) { payment.date >= startDate and payment.date <= endDate });
  };

  public query ({ caller }) func getChallansByDateRange(startDate : Int, endDate : Int) : async [Challan] {
    ensureApprovedUser(caller);
    challans.values().toArray().filter(func(challan) { challan.rentDate >= startDate and challan.rentDate <= endDate });
  };

  public query ({ caller }) func getPettyCashByDateRange(startDate : Int, endDate : Int) : async [PettyCash] {
    ensureApprovedUser(caller);
    pettyCashRecords.values().toArray().filter(func(record) { record.date >= startDate and record.date <= endDate });
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    ensureApprovedUser(caller);
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    ensureApprovedUser(caller);
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    ensureApprovedUser(caller);
    if (caller != user and not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func bulkCreateInventoryItems(batch : [InventoryItem]) : async [InventoryBulkCreateResult] {
    ensureAdmin(caller);
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

  /// Update rent date of all existing challans by re-uploading original csv file.
  /// This is an admin-only operation to restore corrupted rent dates.
  public shared ({ caller }) func updateChallanRentDates(challanData : [Challan]) : async () {
    ensureAdmin(caller);
    for (challan in challanData.values()) {
      switch (challans.get(challan.id)) {
        case (?_) {
          challans.add(challan.id, challan);
        };
        case (null) {};
      };
    };
  };

  public query ({ caller }) func getBuildMetadata() : async BuildMetadata {
    {
      buildTime;
      gitCommitHash;
      canisterId = caller;
    };
  };

  public query ({ caller }) func healthCheck() : async Int {
    buildTime;
  };

  // UserApproval-specific functions

  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(approvalState, caller);
  };

  public query ({ caller }) func isCallerApproved() : async Bool {
    isAdmin(caller) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    ensureAdmin(caller);
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    ensureAdmin(caller);
    UserApproval.listApprovals(approvalState);
  };
};
