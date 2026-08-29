import * as React from "react";
import PropTypes from "prop-types";
import TextField from "@mui/material/TextField";
import Autocomplete, { autocompleteClasses } from "@mui/material/Autocomplete";
import useMediaQuery from "@mui/material/useMediaQuery";
import ListSubheader from "@mui/material/ListSubheader";
import Popper from "@mui/material/Popper";
import { useTheme, styled } from "@mui/material/styles";
import { List, useListRef } from "react-window";
import Typography from "@mui/material/Typography";

const LISTBOX_PADDING = 8;

// ✅ Row for virtualized dropdown
function RowComponent({ index, itemData, style }) {
    const dataSet = itemData[index];
    const inlineStyle = {
        ...style,
        top: (style.top ?? 0) + LISTBOX_PADDING,
    };

    const { key, ...optionProps } = dataSet[0];
    const option = dataSet[1];

    return (
        <Typography key={key} component="li" {...optionProps} noWrap style={inlineStyle}>
            {option?.displayText || ""}
        </Typography>
    );
}

// ✅ Listbox (react-window virtualized list)
const ListboxComponent = React.forwardRef(function ListboxComponent(props, ref) {
    const { children, internalListRef, onItemsBuilt, ...other } = props;
    const itemData = [];
    const optionIndexMap = React.useMemo(() => new Map(), []);

    children.forEach((item) => {
        itemData.push(item);
        if ("children" in item && Array.isArray(item.children)) {
            itemData.push(...item.children);
        }
    });

    itemData.forEach((item, index) => {
        if (Array.isArray(item) && item[1]?.displayText) {
            optionIndexMap.set(item[1].displayText, index);
        }
    });

    React.useEffect(() => {
        if (onItemsBuilt) onItemsBuilt(optionIndexMap);
    }, [onItemsBuilt, optionIndexMap]);

    const theme = useTheme();
    const smUp = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
    const itemCount = itemData.length;
    const itemSize = smUp ? 36 : 48;

    const getChildSize = (child) => itemSize;

    const getHeight = () =>
        itemCount > 8
            ? 8 * itemSize
            : itemData.map(getChildSize).reduce((a, b) => a + b, 0);

    const { className, ...otherProps } = other;

    return (
        <div ref={ref} {...otherProps}>
            <List
                className={className}
                listRef={internalListRef}
                key={itemCount}
                rowCount={itemCount}
                rowHeight={(index) => getChildSize(itemData[index])}
                rowComponent={RowComponent}
                rowProps={{ itemData }}
                style={{
                    height: getHeight() + 2 * LISTBOX_PADDING,
                    width: "100%",
                }}
                overscanCount={5}
                tagName="ul"
            />
        </div>
    );
});

// ✅ Styled Popper for dropdown
const StyledPopper = styled(Popper)({
    [`& .${autocompleteClasses.listbox}`]: {
        boxSizing: "border-box",
        "& ul": { padding: 0, margin: 0 },
    },
});

// ✅ Main reusable component
export default function VirtualizedAutocomplete({
    data = [],
    label = "Select Option",
    width = "100%",
    valueKey = "companyname", // key to display from data
    value = null,
    onChange,
    ...props
}) {
    const internalListRef = useListRef(null);
    const optionIndexMapRef = React.useRef(new Map());

    // Normalize data for consistent structure
    const normalizedData = React.useMemo(
        () =>
            data.map((item) => ({
                ...item,
                displayText: item[valueKey] ?? "",
            })),
        [data, valueKey]
    );

    const handleItemsBuilt = React.useCallback((optionIndexMap) => {
        optionIndexMapRef.current = optionIndexMap;
    }, []);

    const handleHighlightChange = (event, option) => {
        if (option && internalListRef.current) {
            const index = optionIndexMapRef.current.get(option.displayText);
            if (index !== undefined) {
                internalListRef.current.scrollToRow({ index, align: "auto" });
            }
        }
    };

    return (
        <Autocomplete
            sx={{
                width, '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: '#fcfcfd',
                },
            }}
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 2,
                        boxShadow: 'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px',
                        mt: 0.5,
                    },
                },
                listbox: {
                    component: ListboxComponent,
                    internalListRef,
                    onItemsBuilt: handleItemsBuilt,
                },
            }}
            disableListWrap
            options={normalizedData}
            value={value}
            getOptionLabel={(option) => option?.displayText || ''}
            isOptionEqualToValue={(option, value) =>
                option?.[valueKey] === value?.[valueKey]
            }
            onChange={(event, newValue) => onChange?.(newValue)}
            renderInput={(params) => (
                <TextField {...params} label={label} variant="outlined" />
            )}
            renderOption={(props, option, state) => [props, option, state.index]}
            onHighlightChange={handleHighlightChange}
            slots={{ popper: StyledPopper }}
            {...props}
        />
    );
}

// ✅ Prop Types
VirtualizedAutocomplete.propTypes = {
    data: PropTypes.arrayOf(PropTypes.object),
    label: PropTypes.string,
    width: PropTypes.number,
    valueKey: PropTypes.string, // determines which field to show
    onChange: PropTypes.func,
};
