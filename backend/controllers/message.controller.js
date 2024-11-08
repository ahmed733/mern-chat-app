import Conversation from "../model/conversation.model.js";
import Message from "../model/message.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const { id: recieverId } = req.params;
    const senderId = req.user._id;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recieverId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recieverId],
      });
    }
    const newMessage = new Message({
      senderId,
      recieverId,
      message,
    });
    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }
    await Promise.all([conversation.save(), newMessage.save()]);

    ///SOcket Io functionality
    const recieverSocketId = getReceiverSocketId(recieverId);
    if (recieverSocketId) {
      // io.to(<socket_id>).emit() used to send events to specific client
      io.to(recieverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (err) {
    console.log("Internal Server Error", err.message);
    res.status(500).json({
      error: err.message,
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;
    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, userToChatId] },
    }).populate("messages");

    if (!conversation) return res.status(200).json([]);
    const messages = conversation.messages;
    res.status(200).json(messages);
  } catch (err) {
    console.log("Internal Server Error", err.message);
    res.status(500).json({
      error: err.message,
    });
  }
};
