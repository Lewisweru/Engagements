import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { Server } from 'socket.io';
import accountRoutes from './routes/accounts.js';
import orderRoutes from './routes/orders.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/api/accounts', accountRoutes);
app.use('/api/orders', orderRoutes);

// Socket.IO for real-time cart updates
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('reserveAccount', async (accountId) => {
    try {
      const account = await prisma.account.update({
        where: { id: accountId },
        data: {
          isReserved: true,
          reservedAt: new Date(),
          reservedBy: socket.id
        }
      });
      
      // Set timeout to release account after 10 minutes
      setTimeout(async () => {
        const currentAccount = await prisma.account.findUnique({
          where: { id: accountId }
        });
        
        if (currentAccount?.isReserved && !currentAccount?.soldAt) {
          await prisma.account.update({
            where: { id: accountId },
            data: {
              isReserved: false,
              reservedAt: null,
              reservedBy: null
            }
          });
          io.emit('accountReleased', accountId);
        }
      }, 600000); // 10 minutes

      socket.emit('accountReserved', account);
      socket.broadcast.emit('accountUnavailable', accountId);
    } catch (error) {
      socket.emit('error', 'Failed to reserve account');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});