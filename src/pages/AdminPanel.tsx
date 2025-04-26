
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserIcon, CalendarIcon, CheckCircle2Icon } from "lucide-react";

type User = {
  id: number;
  username: string;
  phone: string;
  subscription: {
    active: boolean;
    expiry: string;
    maxChats: number;
  };
  chats: string[];
};

const AdminPanel = () => {
  const [command, setCommand] = useState("");
  const [cmdResult, setCmdResult] = useState("");
  
  const [users] = useState<User[]>([
    {
      id: 1,
      username: "ivan_ivanov",
      phone: "+7 912 345 67 89",
      subscription: {
        active: true,
        expiry: "2025-05-26",
        maxChats: 5,
      },
      chats: ["Семейный чат", "Рабочий чат", "Друзья"]
    },
    {
      id: 2,
      username: "maria_petrova",
      phone: "+7 987 654 32 10",
      subscription: {
        active: false,
        expiry: "",
        maxChats: 2,
      },
      chats: ["Коллеги"]
    }
  ]);
  
  const executeCommand = () => {
    if (!command.startsWith("/add")) {
      setCmdResult("Ошибка: неизвестная команда. Используйте /add - username - days");
      return;
    }
    
    const parts = command.split("-").map(part => part.trim());
    
    if (parts.length !== 3 || parts[0] !== "/add" || !parts[1] || isNaN(Number(parts[2]))) {
      setCmdResult("Ошибка: неверный формат команды. Используйте /add - username - days");
      return;
    }
    
    const username = parts[1];
    const days = parseInt(parts[2]);
    
    // В реальном приложении здесь был бы API-запрос
    const user = users.find(u => u.username === username);
    
    if (!user) {
      setCmdResult(`Пользователь ${username} не найден`);
      return;
    }
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    setCmdResult(`Подписка для ${username} успешно активирована на ${days} дней до ${expiryDate.toLocaleDateString()}`);
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Панель администратора Telegram бота</h1>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Управление подписками</CardTitle>
              <CardDescription>
                Используйте команду /add - username - days для выдачи подписки пользователю
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 mb-4">
                <Input 
                  placeholder="/add - username - days" 
                  value={command} 
                  onChange={(e) => setCommand(e.target.value)}
                />
                <Button onClick={executeCommand}>Выполнить</Button>
              </div>
              
              {cmdResult && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">{cmdResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Пользователи</CardTitle>
              <CardDescription>
                Список пользователей и их подписки
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Чаты</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>
                        {user.subscription.active ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2Icon className="mr-1 h-3 w-3" />
                            Активна до {user.subscription.expiry}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Бесплатная версия</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.chats.map((chat, idx) => (
                            <Badge key={idx} variant="secondary">{chat}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Продлить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
