export type DemoAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
};

export const demoAccounts: DemoAccount[] = [
  {
    id: "u1",
    name: "Анна Смирнова",
    email: "admin@corp.local",
    password: "Admin123!",
    role: "Администратор",
  },
  {
    id: "u2",
    name: "Иван Петров",
    email: "manager@corp.local",
    password: "Manager123!",
    role: "Менеджер",
  },
  {
    id: "u3",
    name: "Елена Морозова",
    email: "employee@corp.local",
    password: "Employee123!",
    role: "Сотрудник",
  },
];
