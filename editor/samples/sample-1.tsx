import Input from "../input";

export default function Sample1() {
  return (
    <div className="border rounded-lg">
      <p className="text-center text-xl">A sample Input instance</p>
      <Input className="p-2 pb-4" placeholder="Start typing here" />
    </div>
  );
}
