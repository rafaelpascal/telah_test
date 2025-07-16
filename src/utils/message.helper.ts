import prisma from "../packages/libs/prisma";

export const saveMessageReport = async ({
  sender,
  recipient,
  send_message,
  status,
}: {
  sender: string;
  recipient: string;
  send_message: string;
  status: string;
}) => {
  return await prisma.messageReport.create({
    data: {
      sender,
      recipient,
      send_message,
      status,
    },
  });
};
