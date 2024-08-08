export const shortenString = (str: string, length: number) => {
  if (str?.length > length) {
    return (
      str?.slice(0, length) +
      "...." +
      str?.slice(str?.length - length, str?.length)
    );
  }
  return str;
};
