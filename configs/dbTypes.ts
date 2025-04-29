export type Message = {
  role: "system" | "assistant" | "user";
  content: string;
  isDraft?: boolean;
}  

export type User = {
  name: string;
  accent: string;
  char: string;
  charAccent: string;
}