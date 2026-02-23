import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import UserApproval "user-approval/approval";

module {
  type OldActor = {
    approvalState : UserApproval.UserApprovalState;
    bootstrapAdmins : List.List<Principal>;
    userProfiles : Map.Map<Principal, { name : Text }>;
  };

  type NewActor = {
    // No longer uses approvalState, bootstrapAdmins, or userProfiles
  };

  public func run(old : OldActor) : NewActor {
    // Simply drop approvalState, bootstrapAdmins, and userProfiles
    {};
  };
};
