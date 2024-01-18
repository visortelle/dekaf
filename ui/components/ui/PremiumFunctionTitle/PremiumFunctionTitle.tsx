import s from './PremiumFunctionTitle.module.css';

type PremiumFunctionTitleProps = {
  isBlock?: boolean
}

const PremiumFunctionTitle: React.FC<PremiumFunctionTitleProps> = (props) => {
  return (
    props.isBlock
      ? (
        <div className={s.TitleWrapper}>
          This function is not available for your current plan. Please upgrade your it at <a target='_blank'
                                                                                             href="https://dekaf.io">https://dekaf.io</a>
        </div>
      ) : (
        <>This function is not available for your current plan. Please upgrade your it at <a target='_blank'
                                                                                             href="https://dekaf.io">https://dekaf.io</a></>
      )
  );
}

export default PremiumFunctionTitle;
