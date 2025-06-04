interface TransactionBlock {
  digest: string;
  effects: Effects;
  objectChanges: ObjectChange[];
  timestampMs: string;
  checkpoint: string;
}

interface ObjectChange {
  type: string;
  sender: string;
  owner: Owner4;
  objectType: string;
  objectId: string;
  version: string;
  previousVersion?: string;
  digest: string;
}

interface Owner4 {
  AddressOwner?: string;
  Shared?: Shared;
  ObjectOwner?: string;
}

interface Effects {
  messageVersion: string;
  status: Status;
  executedEpoch: string;
  gasUsed: GasUsed;
  modifiedAtVersions: ModifiedAtVersion[];
  sharedObjects: SharedObject[];
  transactionDigest: string;
  created: Created[];
  mutated: Mutated[];
  gasObject: GasObject;
  eventsDigest: string;
  dependencies: string[];
}

interface GasObject {
  owner: Owner3;
  reference: SharedObject;
}

interface Owner3 {
  AddressOwner: string;
}

interface Mutated {
  owner: Owner2;
  reference: SharedObject;
}

interface Owner2 {
  AddressOwner?: string;
  Shared?: Shared;
}

interface Shared {
  initial_shared_version: number;
}

interface Created {
  owner: Owner;
  reference: SharedObject;
}

interface Owner {
  ObjectOwner: string;
}

interface SharedObject {
  objectId: string;
  version: number;
  digest: string;
}

interface ModifiedAtVersion {
  objectId: string;
  sequenceNumber: string;
}

interface GasUsed {
  computationCost: string;
  storageCost: string;
  storageRebate: string;
  nonRefundableStorageFee: string;
}

interface Status {
  status: string;
}