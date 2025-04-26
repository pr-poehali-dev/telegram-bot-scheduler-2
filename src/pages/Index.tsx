
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareIcon, UserCogIcon, RocketIcon } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="max-w-3xl w-full text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 text-black">Telegram Scheduler Bot</h1>
        <p className="text-xl text-gray-600 mb-8">Сервис для отправки отложенных сообщений в чаты Telegram</p>
        
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center">
                <MessageSquareIcon className="mr-2 h-5 w-5" />
                Интерфейс бота
              </CardTitle>
              <CardDescription>
                Веб-интерфейс для управления ботом
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Привяжите свой номер телефона, настройте отправку сообщений в чаты и управляйте подписками.
              </p>
            </CardContent>
            <CardFooter>
              <Link to="/telegram-bot" className="w-full">
                <Button className="w-full">Перейти к боту</Button>
              </Link>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center">
                <UserCogIcon className="mr-2 h-5 w-5" />
                Админ панель
              </CardTitle>
              <CardDescription>
                Панель управления для администраторов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Управляйте пользователями, просматривайте статистику и выдавайте подписки.
              </p>
            </CardContent>
            <CardFooter>
              <Link to="/admin-panel" className="w-full">
                <Button className="w-full" variant="outline">Панель администратора</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center">
              <RocketIcon className="mr-2 h-5 w-5" />
              Возможности бота
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-left space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                <span>Привязка номера телефона аккаунта Telegram к боту</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                <span>Отправка отложенных сообщений в любой чат командой /text</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                <span>Бесплатная версия - отправка сообщений в 2 чата</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">4</span>
                <span>Подписка - отправка сообщений в неограниченное количество чатов</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
      
      <footer className="text-center text-sm text-muted-foreground">
        <p>Токен API: 7636904804:AAHgZNlMzNJpM3oobfd7h_SzFr_ZNoDVZdI</p>
        <p>© 2025 Telegram Scheduler Bot</p>
      </footer>
    </div>
  );
};

export default Index;
