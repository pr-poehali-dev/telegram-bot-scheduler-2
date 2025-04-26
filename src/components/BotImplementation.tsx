
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle2 } from "lucide-react";

// Пример кода для имплементации бота на Node.js с библиотекой telegraf
const nodejsCode = `
// Установите пакеты: npm install telegraf node-cron mongodb
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const { MongoClient } = require('mongodb');

// Подключение к MongoDB
const mongoClient = new MongoClient('mongodb://localhost:27017');
let db;

async function connectToDb() {
  await mongoClient.connect();
  db = mongoClient.db('telegram_scheduler_bot');
  console.log('Connected to MongoDB');
}

// Инициализация бота
const bot = new Telegraf('7636904804:AAHgZNlMzNJpM3oobfd7h_SzFr_ZNoDVZdI');

// Хранилище для пользователей и их сообщений
const users = {};
const pendingMessages = [];

// Команда /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  
  // Создаем или обновляем пользователя в базе
  const user = await db.collection('users').findOneAndUpdate(
    { telegramId: userId },
    { 
      $setOnInsert: { 
        telegramId: userId,
        username: ctx.from.username,
        phone: null,
        subscription: {
          isActive: false,
          maxChats: 2,
          expiryDate: null
        },
        chats: [],
        createdAt: new Date()
      }
    },
    { upsert: true, returnDocument: 'after' }
  );
  
  ctx.reply(
    'Добро пожаловать в планировщик сообщений Telegram!\\n\\n' +
    'Для начала работы необходимо привязать ваш номер телефона.\\n' +
    'Используйте команду /phone для привязки номера.'
  );
});

// Команда /phone для начала верификации телефона
bot.command('phone', (ctx) => {
  ctx.reply(
    'Пожалуйста, поделитесь своим контактом, нажав на кнопку ниже.',
    {
      reply_markup: {
        keyboard: [
          [{ text: 'Поделиться номером телефона', request_contact: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    }
  );
});

// Обработка полученного контакта
bot.on('contact', async (ctx) => {
  const userId = ctx.from.id;
  const contact = ctx.message.contact;
  
  if (contact.user_id !== userId) {
    return ctx.reply('Пожалуйста, отправьте свой собственный контакт.');
  }
  
  // Обновляем пользователя в базе
  await db.collection('users').updateOne(
    { telegramId: userId },
    { $set: { phone: contact.phone_number } }
  );
  
  ctx.reply(
    'Ваш номер телефона успешно привязан!\\n\\n' +
    'Теперь вы можете использовать команду /text в любом чате, чтобы запланировать отправку сообщения.\\n\\n' +
    'Формат: /text Ваше сообщение - 60 (где 60 - время в секундах)'
  );
});

// Команда /text для отправки отложенного сообщения
bot.command('text', async (ctx) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  
  // Проверяем привязан ли телефон
  const user = await db.collection('users').findOne({ telegramId: userId });
  if (!user || !user.phone) {
    return ctx.reply('Сначала привяжите свой номер телефона, используя команду /phone');
  }
  
  // Извлекаем текст и время из сообщения
  const messageParts = ctx.message.text.split(' - ');
  if (messageParts.length < 2) {
    return ctx.reply('Неверный формат. Используйте: /text Ваше сообщение - 60');
  }
  
  const text = messageParts[0].replace('/text', '').trim();
  const delay = parseInt(messageParts[1].trim());
  
  if (isNaN(delay) || delay < 5) {
    return ctx.reply('Неверное время задержки. Минимум 5 секунд.');
  }
  
  // Проверяем, может ли пользователь использовать этот чат
  const userChats = user.chats || [];
  if (!userChats.includes(chatId)) {
    // Если пользователь достиг лимита чатов
    if (userChats.length >= user.subscription.maxChats) {
      return ctx.reply(
        'Вы достигли лимита чатов для бесплатной версии.\\n' +
        'Приобретите подписку или удалите один из существующих чатов.'
      );
    }
    
    // Добавляем чат к пользователю
    await db.collection('users').updateOne(
      { telegramId: userId },
      { $push: { chats: chatId } }
    );
  }
  
  // Создаем отложенное сообщение
  const scheduledTime = new Date(Date.now() + delay * 1000);
  
  await db.collection('scheduledMessages').insertOne({
    userId,
    chatId,
    text,
    scheduledTime,
    isProcessed: false
  });
  
  // Отправляем подтверждение
  ctx.reply(\`Сообщение запланировано к отправке через \${delay} секунд\`);
});

// Команда /add для администратора
bot.command('add', async (ctx) => {
  // Проверка на админа (замените на свой ID)
  if (ctx.from.id !== 123456789) {
    return ctx.reply('У вас нет прав для использования этой команды.');
  }
  
  const parts = ctx.message.text.split('-').map(part => part.trim());
  
  if (parts.length !== 3 || parts[0] !== '/add') {
    return ctx.reply('Неверный формат. Используйте: /add - username - days');
  }
  
  const username = parts[1];
  const days = parseInt(parts[2]);
  
  if (isNaN(days) || days <= 0) {
    return ctx.reply('Неверное количество дней.');
  }
  
  // Находим пользователя по username
  const user = await db.collection('users').findOne({ username });
  
  if (!user) {
    return ctx.reply(\`Пользователь \${username} не найден.\`);
  }
  
  // Рассчитываем дату окончания подписки
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  
  // Обновляем подписку пользователя
  await db.collection('users').updateOne(
    { username },
    { 
      $set: { 
        'subscription.isActive': true,
        'subscription.expiryDate': expiryDate,
        'subscription.maxChats': 10 // Например, 10 чатов для платных пользователей
      }
    }
  );
  
  ctx.reply(\`Подписка для \${username} активирована на \${days} дней.\`);
});

// Фоновая задача для проверки и отправки отложенных сообщений
cron.schedule('*/5 * * * * *', async () => {
  try {
    const currentTime = new Date();
    
    // Находим все сообщения, которые нужно отправить
    const messages = await db.collection('scheduledMessages').find({
      scheduledTime: { $lte: currentTime },
      isProcessed: false
    }).toArray();
    
    for (const message of messages) {
      try {
        // Отправляем сообщение
        await bot.telegram.sendMessage(message.chatId, message.text);
        
        // Отмечаем как обработанное
        await db.collection('scheduledMessages').updateOne(
          { _id: message._id },
          { $set: { isProcessed: true } }
        );
      } catch (err) {
        console.error(\`Error sending message: \${err.message}\`);
      }
    }
  } catch (err) {
    console.error(\`Cron job error: \${err.message}\`);
  }
});

// Проверка и обновление просроченных подписок
cron.schedule('0 0 * * *', async () => {
  const currentDate = new Date();
  
  // Находим пользователей с истекшей подпиской
  await db.collection('users').updateMany(
    { 
      'subscription.isActive': true,
      'subscription.expiryDate': { $lt: currentDate }
    },
    {
      $set: {
        'subscription.isActive': false,
        'subscription.maxChats': 2
      }
    }
  );
});

// Запуск бота
async function startBot() {
  try {
    await connectToDb();
    await bot.launch();
    console.log('Bot started');
  } catch (err) {
    console.error(\`Failed to start bot: \${err.message}\`);
  }
}

startBot();
`;

const BotImplementation = () => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(nodejsCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Реализация Telegram бота</CardTitle>
        <CardDescription>
          Код для создания функционального бота с помощью Node.js и библиотеки Telegraf
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="code">
          <TabsList className="mb-4">
            <TabsTrigger value="code">Код бота</TabsTrigger>
            <TabsTrigger value="instructions">Инструкция по запуску</TabsTrigger>
          </TabsList>
          <TabsContent value="code">
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm" 
                className="absolute right-2 top-2"
                onClick={copyToClipboard}
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Скопировано" : "Копировать"}
              </Button>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[500px] text-sm">
                <code>{nodejsCode}</code>
              </pre>
            </div>
          </TabsContent>
          <TabsContent value="instructions">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Требования</h3>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Node.js 14+ установленный на сервере</li>
                  <li>MongoDB для хранения данных</li>
                  <li>Доступ к интернету для подключения к API Telegram</li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Шаги по установке</h3>
                <ol className="list-decimal pl-5 mt-2 space-y-2">
                  <li>Создайте новую директорию для проекта</li>
                  <li>Создайте файл <code>bot.js</code> и вставьте код выше</li>
                  <li>Установите зависимости:
                    <pre className="bg-muted p-2 rounded-md mt-1">npm install telegraf node-cron mongodb</pre>
                  </li>
                  <li>Установите и запустите MongoDB если у вас его нет:
                    <pre className="bg-muted p-2 rounded-md mt-1">sudo apt-get install mongodb</pre>
                  </li>
                  <li>Замените ID администратора на свой:
                    <pre className="bg-muted p-2 rounded-md mt-1">if (ctx.from.id !== 123456789) {'{'} // Замените на свой ID</pre>
                  </li>
                  <li>Запустите бота:
                    <pre className="bg-muted p-2 rounded-md mt-1">node bot.js</pre>
                  </li>
                </ol>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Команды бота</h3>
                <ul className="mt-2 space-y-2">
                  <li><code>/start</code> - Начать использование бота</li>
                  <li><code>/phone</code> - Привязать номер телефона</li>
                  <li><code>/text [сообщение] - [время в секундах]</code> - Отправить отложенное сообщение</li>
                  <li><code>/add - [username] - [days]</code> - Команда администратора для выдачи подписки</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <div>Используйте этот код на свой страх и риск</div>
        <div>Версия 1.0.0</div>
      </CardFooter>
    </Card>
  );
};

export default BotImplementation;
