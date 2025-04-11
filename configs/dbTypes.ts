export enum Role {
    User = 0,
    Assistant = 1,
}

export interface Message {
  role: Role;
  timestamp: number;
  content: string;
  isDraft: boolean;
}  