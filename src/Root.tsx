import { Composition } from "remotion";
import { Toba, TOTAL } from "./Toba";
import { Gurita, GURITA_TOTAL } from "./Gurita";
import { Bubur, BUBUR_TOTAL } from "./Bubur";
import { Mie, MIE_TOTAL } from "./Mie";
import { Gaji, GAJI_TOTAL } from "./Gaji";
import { Vlog2, VLOG2_TOTAL } from "./Vlog2";

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="KayaProses"
      component={Vlog2}
      durationInFrames={VLOG2_TOTAL}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="GuaKayaGengsi"
      component={Gaji}
      durationInFrames={GAJI_TOTAL}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="FaktaMie"
      component={Mie}
      durationInFrames={MIE_TOTAL}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="FaktaBubur"
      component={Bubur}
      durationInFrames={BUBUR_TOTAL}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="FaktaGurita"
      component={Gurita}
      durationInFrames={GURITA_TOTAL}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DanauToba"
      component={Toba}
      durationInFrames={TOTAL}
      fps={30}
      width={1080}
      height={1920}
    />
    </>
  );
};
