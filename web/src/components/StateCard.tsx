import { ReactNode } from "react";
import {
    Card,
    Statistic,
} from "antd";

const StateCard = ({ title, subTitle, value, bgColor, icon }: { title: string; subTitle: string; value: string; bgColor: string; icon: ReactNode }) => {
    return <Card
        className="hover:shadow-lg transition-all duration-300"
        styles={{ body: { padding: "20px" } }}
        style={{ backgroundColor: bgColor }}
    >
        <div className="flex items-center justify-between">
            <div>
                <Statistic
                    title={
                        <span className="text-white font-medium">
                            {title}
                        </span>
                    }
                    value={value}
                    valueStyle={{
                        color: "#fff",
                        fontSize: "28px",
                        fontWeight: "bold"
                    }}
                />
                <div className="mt-2 text-sm text-white opacity-800">{subTitle}</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                {icon}
            </div>
        </div>
    </Card>
};

export default StateCard;