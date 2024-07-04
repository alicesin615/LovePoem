export type MainTableSchema = {
  id: number;
  name: string;
  description: string;
  image: string;
};

export type AttributesTableSchema = {
  main_id: number;
  trait_type: string;
  value: string;
};
