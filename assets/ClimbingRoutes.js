import React, { useEffect, useState } from "react";

const ClimbingRoutes = ({ routes }) => {
    const [search, setSearch] = useState("");

    const filteredRoutes = routes.filter((route) =>
        route.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="container my-4">
            <h1 className="text-center mb-4">Rutas de Escalada</h1>

            <div className="input-group mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar rutas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <table className="table">
                <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Dificultad</th>
                    <th>Acciones</th>
                </tr>
                </thead>
                <tbody>
                {filteredRoutes.map((route) => (
                    <tr key={route.id}>
                        <td>{route.name}</td>
                        <td>{route.routeType}</td>
                        <td>{route.difficulty}</td>
                        <td>
                            <button className="btn btn-warning btn-sm me-2">
                                Editar
                            </button>
                            <button className="btn btn-info btn-sm me-2">
                                Ver
                            </button>
                            <button className="btn btn-danger btn-sm">
                                Eliminar
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            {filteredRoutes.length === 0 && (
                <div className="text-center py-4 text-gray-600">
                    No se encontraron rutas.
                </div>
            )}
        </div>
    );
};

export default ClimbingRoutes;
