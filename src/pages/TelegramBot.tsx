
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhoneIcon, SendIcon, InfoIcon, ClockIcon } from "lucide-react";

const TelegramBot = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [chats, setChats] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [delay, setDelay] = useState("60");
  const [status, setStatus] = useState("");
  const [subscription, setSubscription] = useState({
    isActive: false,
    maxChats: 2,
    expiryDate: "",
  });

  // Имитация верификации номера телефона
  const verifyPhone = () => {
    if (phoneNumber.length >= 10) {
      setStatus("Код подтверждения отправлен");
      // В реальном приложении здесь был бы API-запрос
    } else {
      setStatus("Пожалуйста, введите корректный номер телефона");
    }
  };

  // Имитация проверки кода подтверждения
  const confirmCode = () => {
    if (verificationCode.length === 5) {
      setIsVerified(true);
      setStatus("Телефон успешно подтвержден");
      // Имитация получения списка чатов
      setChats(["Семейный чат", "Рабочий чат"]);
    } else {
      setStatus("Неверный код подтверждения");
    }
  };

  // Имитация отправки отложенного сообщения
  const scheduleMessage = () => {
    if (!message) {
      setStatus("Пожалуйста, введите сообщение");
      return;
    }

    if (!chats.length) {
      setStatus("Выберите хотя бы один чат");
      return;
    }

    const delaySeconds = parseInt(delay) || 60;
    setStatus(`Сообщение будет отправлено через ${delaySeconds} секунд в выбранные чаты`);
    
    // В реальном приложении здесь был бы API-запрос
    setTimeout(() => {
      setStatus("Сообщение отправлено успешно");
    }, 2000);
  };

  // Имитация обновления подписки
  useEffect(() => {
    // В реальном приложении информация о подписке пришла бы с сервера
    setSubscription({
      isActive: false,
      maxChats: 2,
      expiryDate: "Бесплатная версия",
    });
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Telegram бот для отложенных сообщений</CardTitle>
            <CardDescription>
              Привяжите свой номер телефона и настройте отправку сообщений в чаты
            </CardDescription>
          </CardHeader>

          <Tabs defaultValue={isVerified ? "messages" : "authentication"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="authentication">Авторизация</TabsTrigger>
              <TabsTrigger value="messages" disabled={!isVerified}>
                Сообщения
              </TabsTrigger>
            </TabsList>

            <TabsContent value="authentication">
              <CardContent className="space-y-4 py-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Подключение к Telegram</h3>
                  <p className="text-sm text-muted-foreground">
                    Введите номер телефона, который привязан к вашему аккаунту Telegram
                  </p>
                </div>

                {!isVerified ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <PhoneIcon className="h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="+7 900 123 45 67"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                      <Button onClick={verifyPhone}>Отправить код</Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Код подтверждения"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                      />
                      <Button onClick={confirmCode}>Подтвердить</Button>
                    </div>
                  </>
                ) : (
                  <div className="bg-green-50 p-4 rounded-md border border-green-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <InfoIcon className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Телефон успешно подтвержден
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Теперь вы можете настроить отправку сообщений</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="messages">
              <CardContent className="space-y-4 py-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Отправка сообщений в чаты</h3>
                  <p className="text-sm text-muted-foreground">
                    Напишите сообщение, выберите чаты и укажите задержку перед отправкой
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Выберите чаты</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {chats.map((chat, index) => (
                        <div
                          key={index}
                          className="flex items-center p-2 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            id={`chat-${index}`}
                            className="mr-2"
                          />
                          <label htmlFor={`chat-${index}`} className="cursor-pointer">
                            {chat}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {subscription.isActive
                        ? `Доступно чатов: ${subscription.maxChats}`
                        : "Бесплатная версия: доступно 2 чата"}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Текст сообщения</label>
                    <textarea
                      className="w-full p-2 mt-1 border border-gray-300 rounded-md h-24"
                      placeholder="Введите текст сообщения"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Задержка перед отправкой (секунды)</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <ClockIcon className="h-5 w-5 text-muted-foreground" />
                      <Input
                        type="number"
                        min="5"
                        placeholder="60"
                        value={delay}
                        onChange={(e) => setDelay(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  {subscription.isActive
                    ? `Подписка активна до: ${subscription.expiryDate}`
                    : "Бесплатная версия"}
                </div>
                <Button onClick={scheduleMessage}>
                  <SendIcon className="mr-2 h-4 w-4" /> Запланировать отправку
                </Button>
              </CardFooter>
            </TabsContent>
          </Tabs>

          {status && (
            <div className="px-4 py-3 mb-4 mx-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">{status}</p>
            </div>
          )}
        </Card>
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Для администраторов: используйте команду <code>/add - username - day</code> в боте
            для выдачи подписки пользователям.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TelegramBot;
