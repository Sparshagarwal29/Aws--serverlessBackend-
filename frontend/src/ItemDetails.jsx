import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCoffee, updateCoffee, deleteCoffee } from "./utils/apis";
import reactImg from "./assets/react.svg";

const ItemDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [coffee, setCoffee] = useState(null);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        getCoffee(id).then(data => setCoffee(data.Item));
    }, [id]);

    const toggleEditMode = () => {
        setEditMode(!editMode);
    }

    const handleUpdate = () => {
        updateCoffee(id, coffee).then(() => toggleEditMode());
    };

    const handleDelete = () => {
        deleteCoffee(id).then(() => navigate("/"));
    };

    if (!coffee) return <p>Loading...</p>;

    return (
        <div className="container">
            <h1>{editMode ? "Edit Coffee" : coffee.name}</h1>
            {editMode ? (
                <>
                    <input className="styled-input" value={coffee.coffeeId} onChange={e => setCoffee({ ...coffee, coffeeId: e.target.value })} />
                    <input className="styled-input" value={coffee.name} onChange={e => setCoffee({ ...coffee, name: e.target.value })} />
                    <input className="styled-input" type="number" value={coffee.price} onChange={e => setCoffee({ ...coffee, price: Number(e.target.value) })} />
                    <label>
                        <input type="checkbox" checked={coffee.available} onChange={e => setCoffee({ ...coffee, available: e.target.checked })} /> Available
                    </label>
                </>
            ) : (
                <>
                    <img src={reactImg} alt="coffee" />
                    <p>Price: ${coffee.price}</p>
                    <p>{coffee.available ? "Available" : "Not Available"}</p>
                </>

            )}
            <button onClick={editMode ? handleUpdate : toggleEditMode}>{editMode ? "Save" : "Edit"}</button>
            <button onClick={handleDelete}>Delete</button>
        </div>
    );
};

export default ItemDetails;
