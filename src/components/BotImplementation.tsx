
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle2 } from "lucide-react";

// Код для имплементации бота на Node.js с библиотекой telegraf
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

// Инициализация бота с вашим токеном
const bot = new Telegraf('7636904804:AAHgZNlMzNJpM3oobfd7h_SzFr_ZNoDVZdI');

// Команда /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  
  try {
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
    
    // Проверяем, привязан ли телефон
    if (!user.value.phone) {
      return ctx.reply(
        'Добро пожаловать в планировщик сообщений Telegram!\\n\\n' +
        'Для начала работы необходимо привязать ваш номер телефона.\\n',
        {
          reply_markup: {
            keyboard: [
              [{ text: 'Поделиться номером телефона', request_contact: true }]
            ],
            resize_keyboard: true
          }
        }
      );
    } else {
      return ctx.reply(
        'Добро пожаловать в планировщик сообщений Telegram!\\n\\n' +
        'Ваш номер телефона уже привязан.\\n' +
        'Используйте команду /text в любом чате, чтобы запланировать отправку сообщения.\\n\\n' +
        'Формат: /text Ваше сообщение - 60 (где 60 - время в секундах)'
      );
    }
  } catch (err) {
    console.error(\`Error in start command: \${err.message}\`);
    ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

// Обработка полученного контакта
bot.on('contact', async (ctx) => {
  const userId = ctx.from.id;
  const contact = ctx.message.contact;
  
  try {
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
      'Формат: /text Ваше сообщение - 60 (где 60 - время в секундах)',
      {
        reply_markup: {
          remove_keyboard: true
        }
      }
    );
  } catch (err) {
    console.error(\`Error processing contact: \${err.message}\`);
    ctx.reply('Произошла ошибка при сохранении номера. Пожалуйста, попробуйте позже.');
  }
});

// Команда /text для отправки отложенного сообщения
bot.command('text', async (ctx) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  
  try {
    // Проверяем привязан ли телефон
    const user = await db.collection('users').findOne({ telegramId: userId });
    if (!user || !user.phone) {
      return ctx.reply(
        'Сначала привяжите свой номер телефона, используя команду /start',
        {
          reply_markup: {
            keyboard: [
              [{ text: 'Поделиться номером телефона', request_contact: true }]
            ],
            resize_keyboard: true
          }
        }
      );
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
          'Приобретите подписку или удалите один из существующих чатов через команду /chats.'
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
      isProcessed: false,
      createdAt: new Date()
    });
    
    // Отправляем подтверждение
    ctx.reply(\`Сообщение запланировано к отправке через \${delay} секунд\`);
  } catch (err) {
    console.error(\`Error in text command: \${err.message}\`);
    ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

// Команда /chats для просмотра и управления чатами
bot.command('chats', async (ctx) => {
  const userId = ctx.from.id;
  
  try {
    const user = await db.collection('users').findOne({ telegramId: userId });
    if (!user || !user.phone) {
      return ctx.reply('Сначала привяжите свой номер телефона, используя команду /start');
    }
    
    const userChats = user.chats || [];
    if (userChats.length === 0) {
      return ctx.reply('У вас пока нет активных чатов. Используйте команду /text в чатах для их добавления.');
    }
    
    const chatsList = await Promise.all(userChats.map(async (chatId, index) => {
      try {
        const chat = await bot.telegram.getChat(chatId);
        return \`\${index + 1}. \${chat.title || chat.username || chat.first_name || 'Чат ' + chatId}\`;
      } catch (err) {
        return \`\${index + 1}. Чат \${chatId} (недоступен)\`;
      }
    }));
    
    ctx.reply(
      \`Ваши активные чаты (\${userChats.length}/\${user.subscription.maxChats}):\\n\\n\${chatsList.join('\\n')}\\n\\n\` +
      'Для удаления чата используйте команду /remove_chat [номер]'
    );
  } catch (err) {
    console.error(\`Error in chats command: \${err.message}\`);
    ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

// Команда /remove_chat для удаления чата
bot.command('remove_chat', async (ctx) => {
  const userId = ctx.from.id;
  const args = ctx.message.text.split(' ');
  
  if (args.length < 2) {
    return ctx.reply('Укажите номер чата для удаления. Например: /remove_chat 1');
  }
  
  const chatIndex = parseInt(args[1]) - 1;
  
  try {
    const user = await db.collection('users').findOne({ telegramId: userId });
    if (!user || !user.phone) {
      return ctx.reply('Сначала привяжите свой номер телефона, используя команду /start');
    }
    
    const userChats = user.chats || [];
    if (chatIndex < 0 || chatIndex >= userChats.length) {
      return ctx.reply('Неверный номер чата. Используйте команду /chats чтобы увидеть список чатов.');
    }
    
    const chatToRemove = userChats[chatIndex];
    
    await db.collection('users').updateOne(
      { telegramId: userId },
      { $pull: { chats: chatToRemove } }
    );
    
    ctx.reply('Чат успешно удален из вашего списка.');
  } catch (err) {
    console.error(\`Error in remove_chat command: \${err.message}\`);
    ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

// Команда /help для отображения справки
bot.help((ctx) => {
  ctx.reply(
    'Доступные команды:\\n\\n' +
    '/start - Начать работу с ботом\\n' +
    '/text [сообщение] - [время в секундах] - Запланировать отправку сообщения\\n' +
    '/chats - Показать список ваших активных чатов\\n' +
    '/remove_chat [номер] - Удалить чат из списка активных\\n' +
    '/help - Показать эту справку\\n\\n' +
    'Для бесплатных пользователей доступно не более 2 чатов.'
  );
});

// Команда /add для администратора
bot.command('add', async (ctx) => {
  // Список администраторов (замените на свои ID)
  const adminIds = [123456789]; // Добавьте сюда ID администраторов
  
  try {
    // Проверка на админа
    if (!adminIds.includes(ctx.from.id)) {
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
          'subscription.maxChats': 10 // 10 чатов для платных пользователей
        }
      }
    );
    
    ctx.reply(\`Подписка для \${username} активирована на \${days} дней.\`);
    
    // Уведомляем пользователя о выдаче подписки
    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        \`Вам выдана подписка на \${days} дней!\\n\\nТеперь вы можете использовать до 10 чатов.\\nПодписка действует до \${expiryDate.toDateString()}\`
      );
    } catch (err) {
      console.error(\`Failed to notify user: \${err.message}\`);
    }
  } catch (err) {
    console.error(\`Error in add command: \${err.message}\`);
    ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

// Фоновая задача для проверки и отправки отложенных сообщений (каждые 5 секунд)
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
          { $set: { isProcessed: true, sentAt: new Date() } }
        );
        
        console.log(\`Message sent successfully to chat \${message.chatId}\`);
      } catch (err) {
        console.error(\`Error sending message to chat \${message.chatId}: \${err.message}\`);
        
        // Помечаем сообщение как проблемное после нескольких попыток
        if (message.attempts >= 3) {
          await db.collection('scheduledMessages').updateOne(
            { _id: message._id },
            { $set: { isProcessed: true, failed: true, error: err.message } }
          );
        } else {
          // Увеличиваем счётчик попыток
          await db.collection('scheduledMessages').updateOne(
            { _id: message._id },
            { $inc: { attempts: 1 } }
          );
        }
      }
    }
  } catch (err) {
    console.error(\`Cron job error: \${err.message}\`);
  }
});

// Проверка и обновление просроченных подписок (каждый день в полночь)
cron.schedule('0 0 * * *', async () => {
  try {
    const currentDate = new Date();
    
    // Находим пользователей с истекшей подпиской
    const expiredSubscriptions = await db.collection('users').find({
      'subscription.isActive': true,
      'subscription.expiryDate': { $lt: currentDate }
    }).toArray();
    
    // Обновляем просроченные подписки
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
    
    // Уведомляем пользователей об окончании подписки
    for (const user of expiredSubscriptions) {
      try {
        await bot.telegram.sendMessage(
          user.telegramId,
          'Ваша подписка истекла. Теперь вы можете использовать только 2 чата.'
        );
      } catch (err) {
        console.error(\`Failed to notify user \${user.telegramId}: \${err.message}\`);
      }
    }
    
    console.log(\`Updated \${expiredSubscriptions.length} expired subscriptions\`);
  } catch (err) {
    console.error(\`Subscription check error: \${err.message}\`);
  }
});

// Обработчик ошибок
bot.catch((err, ctx) => {
  console.error(\`Error in bot: \${err}\`);
  
  // Отправляем сообщение об ошибке пользователю
  ctx.reply('Произошла ошибка при обработке команды. Пожалуйста, попробуйте позже.').catch(e => {
    console.error(\`Could not send error message: \${e}\`);
  });
});

// Запуск бота
async function startBot() {
  try {
    await connectToDb();
    
    // Создаем необходимые индексы в базе данных
    await db.collection('scheduledMessages').createIndex({ scheduledTime: 1, isProcessed: 1 });
    await db.collection('users').createIndex({ telegramId: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 });
    
    // Запускаем бота
    await bot.launch();
    console.log('Bot started successfully');
  } catch (err) {
    console.error(\`Failed to start bot: \${err.message}\`);
  }
}

// Обработка сигналов остановки
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Запускаем бота
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
        <CardTitle>Реализация Telegram бота для отложенных сообщений</CardTitle>
        <CardDescription>
          Готовый код для запуска бота с полной функциональностью после команды /start
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="code">
          <TabsList className="mb-4">
            <TabsTrigger value="code">Код бота</TabsTrigger>
            <TabsTrigger value="instructions">Инструкция по запуску</TabsTrigger>
            <TabsTrigger value="commands">Команды бота</TabsTrigger>
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
                    <pre className="bg-muted p-2 rounded-md mt-1">const adminIds = [123456789]; // Добавьте сюда ID администраторов</pre>
                  </li>
                  <li>Запустите бота:
                    <pre className="bg-muted p-2 rounded-md mt-1">node bot.js</pre>
                  </li>
                </ol>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Запуск в продакшене</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Для стабильной работы в продакшене рекомендуется использовать PM2:
                </p>
                <ol className="list-decimal pl-5 mt-2 space-y-2">
                  <li>Установите PM2 глобально:
                    <pre className="bg-muted p-2 rounded-md mt-1">npm install -g pm2</pre>
                  </li>
                  <li>Запустите бота через PM2:
                    <pre className="bg-muted p-2 rounded-md mt-1">pm2 start bot.js --name telegram-scheduler-bot</pre>
                  </li>
                  <li>Настройте автозапуск:
                    <pre className="bg-muted p-2 rounded-md mt-1">pm2 startup && pm2 save</pre>
                  </li>
                </ol>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="commands">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Команды для пользователей</h3>
                <ul className="mt-2 space-y-2">
                  <li className="p-2 bg-muted rounded-md">
                    <code className="font-bold">/start</code> - Начать использование бота, привязать номер телефона
                  </li>
                  <li className="p-2 bg-muted rounded-md">
                    <code className="font-bold">/text [сообщение] - [время в секундах]</code> - Отправить отложенное сообщение
                    <div className="text-sm text-muted-foreground mt-1">Пример: /text Привет всем! - 60</div>
                  </li>
                  <li className="p-2 bg-muted rounded-md">
                    <code className="font-bold">/chats</code> - Показать список активных чатов пользователя
                  </li>
                  <li className="p-2 bg-muted rounded-md">
                    <code className="font-bold">/remove_chat [номер]</code> - Удалить чат из списка активных
                    <div className="text-sm text-muted-foreground mt-1">Пример: /remove_chat 1</div>
                  </li>
                  <li className="p-2 bg-muted rounded-md">
                    <code className="font-bold">/help</code> - Показать справку по командам
                  </li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Команды для администраторов</h3>
                <ul className="mt-2 space-y-2">
                  <li className="p-2 bg-muted rounded-md">
                    <code className="font-bold">/add - [username] - [days]</code> - Выдать подписку пользователю
                    <div className="text-sm text-muted-foreground mt-1">Пример: /add - user123 - 30</div>
                  </li>
                </ul>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Важно:</strong> После команды /start бот автоматически предложит пользователю поделиться номером телефона для привязки. 
                  Вся основная функциональность доступна сразу после этой привязки.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <div>Используйте этот код для быстрого запуска вашего бота</div>
        <div>Версия 1.1.0</div>
      </CardFooter>
    </Card>
  );
};

export default BotImplementation;
